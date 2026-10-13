// La Central Café — servidor de caja/inventario + menú digital.
// Uso: node server.mjs   (PORT=3000 por defecto)
//   /        -> menú digital (carpeta ../menu)
//   /caja/   -> app de ventas e inventario
//   /api/... -> API JSON
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { db, seed, hashPin, checkPin } from './db.mjs';

const PORT = Number(process.env.PORT || 3000);
const ROOT_MENU = fileURLToPath(new URL('../menu/', import.meta.url));
const ROOT_APP = fileURLToPath(new URL('./public/', import.meta.url));
const PAGOS = ['efectivo', 'nequi', 'daviplata', 'tarjeta'];

if (seed()) console.log('Base de datos creada con datos iniciales (data/lacentral.db)');

// ---------- utilidades ----------
const pad = n => String(n).padStart(2, '0');
const ahora = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const hoy = () => ahora().slice(0, 10);
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (v, { min = -Infinity, max = Infinity, int = false } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) return null;
  return n;
};
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- sesiones (en memoria; expiran a las 12 h) ----------
const sesiones = new Map();
const SESION_MS = 12 * 3600 * 1000;
const intentos = new Map(); // ip -> [timestamps] para frenar adivinar PINs

function usuarioDe(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  const s = m && sesiones.get(m[1]);
  if (!s || s.exp < Date.now()) return null;
  s.exp = Date.now() + SESION_MS;
  return db.prepare('SELECT id, usuario, nombre, rol FROM usuarios WHERE id = ? AND activo = 1').get(s.uid) || null;
}
const requiere = (u, rol) => {
  if (!u) fail(401, 'Inicia sesión');
  if (rol === 'admin' && u.rol !== 'admin') fail(403, 'Solo el administrador puede hacer esto');
};

// ---------- lógica ----------
function datos() {
  return {
    productos: db.prepare('SELECT * FROM productos ORDER BY orden').all(),
    insumos: db.prepare('SELECT * FROM insumos ORDER BY activo DESC, nombre').all(),
    recetas: db.prepare('SELECT * FROM recetas').all(),
  };
}

function receta(productoId, variante) {
  const rows = db.prepare(`SELECT r.insumo_id, r.cantidad, i.costo, i.nombre FROM recetas r JOIN insumos i ON i.id = r.insumo_id
                           WHERE r.producto_id = ? AND (r.variante = 'base' OR r.variante = ?)`).all(productoId, variante);
  return rows;
}

function registrarVenta(u, body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 60) fail(400, 'La venta no tiene productos');
  const pago = PAGOS.includes(body.pago) ? body.pago : fail(400, 'Medio de pago inválido');
  const getP = db.prepare('SELECT * FROM productos WHERE id = ? AND activo = 1');

  const lineas = items.map(it => {
    const p = getP.get(String(it.producto_id)) || fail(400, 'Producto no disponible');
    const variante = it.variante === 'combo' ? 'combo' : 'base';
    if (variante === 'combo' && !p.precio_combo) fail(400, `${p.nombre} no tiene combo`);
    const cantidad = num(it.cantidad, { min: 1, max: 99, int: true }) ?? fail(400, 'Cantidad inválida');
    const precio = variante === 'combo' ? p.precio_combo : p.precio;
    const rec = receta(p.id, variante);
    const costo = rec.reduce((a, r) => a + r.cantidad * r.costo, 0);
    return { p, variante, cantidad, precio, rec, costo };
  });
  const total = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
  let recibido = null;
  if (pago === 'efectivo' && body.recibido != null && body.recibido !== '') {
    recibido = num(body.recibido, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Monto recibido inválido');
    if (recibido < total) fail(400, 'El efectivo recibido es menor al total');
  }

  return tx(() => {
    const fecha = ahora();
    const ventaId = Number(db.prepare('INSERT INTO ventas (fecha, usuario_id, total, pago, recibido) VALUES (?,?,?,?,?)')
      .run(fecha, u.id, total, pago, recibido).lastInsertRowid);
    const ii = db.prepare('INSERT INTO venta_items (venta_id, producto_id, nombre, variante, cantidad, precio, costo) VALUES (?,?,?,?,?,?,?)');
    const mv = db.prepare(`INSERT INTO movimientos (fecha, insumo_id, tipo, cantidad, costo, venta_id, usuario_id) VALUES (?,?,'venta',?,?,?,?)`);
    const st = db.prepare('UPDATE insumos SET stock = stock - ? WHERE id = ?');
    for (const l of lineas) {
      ii.run(ventaId, l.p.id, l.p.nombre + (l.variante === 'combo' ? ' (combo)' : ''), l.variante, l.cantidad, l.precio, l.costo);
      for (const r of l.rec) {
        const q = r.cantidad * l.cantidad;
        st.run(q, r.insumo_id);
        mv.run(fecha, r.insumo_id, -q, r.costo * q, ventaId, u.id);
      }
    }
    const alertas = db.prepare('SELECT nombre, stock, minimo, unidad FROM insumos WHERE activo = 1 AND stock <= minimo ORDER BY stock').all();
    return { id: ventaId, fecha, total, cambio: recibido != null ? recibido - total : null, alertas };
  });
}

function anularVenta(u, id) {
  const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id) || fail(404, 'Venta no encontrada');
  if (v.anulada) fail(400, 'La venta ya estaba anulada');
  return tx(() => {
    const fecha = ahora();
    db.prepare('UPDATE ventas SET anulada = 1 WHERE id = ?').run(id);
    const movs = db.prepare(`SELECT insumo_id, cantidad, costo FROM movimientos WHERE venta_id = ? AND tipo = 'venta'`).all(id);
    for (const m of movs) {
      db.prepare('UPDATE insumos SET stock = stock - ? WHERE id = ?').run(m.cantidad, m.insumo_id); // cantidad es negativa
      db.prepare(`INSERT INTO movimientos (fecha, insumo_id, tipo, cantidad, costo, venta_id, usuario_id, nota)
                  VALUES (?,?,'anulacion',?,?,?,?,?)`).run(fecha, m.insumo_id, -m.cantidad, m.costo, id, u.id, `Anulación venta #${id}`);
    }
    return { ok: true };
  });
}

function movimientoInsumo(u, id, body) {
  const ins = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id) || fail(404, 'Insumo no encontrado');
  const tipo = ['compra', 'ajuste', 'merma'].includes(body?.tipo) ? body.tipo : fail(400, 'Tipo de movimiento inválido');
  const nota = typeof body.nota === 'string' ? body.nota.slice(0, 200) : null;
  return tx(() => {
    const fecha = ahora();
    let delta, costo = null;
    if (tipo === 'compra') {
      delta = num(body.cantidad, { min: 0.001, max: 100000 }) ?? fail(400, 'Cantidad inválida');
      const ct = body.costo_total === '' || body.costo_total == null ? null : num(body.costo_total, { min: 0, max: 100_000_000 });
      if (ct === null && body.costo_total) fail(400, 'Costo inválido');
      if (ct != null) { costo = ct; db.prepare('UPDATE insumos SET costo = ? WHERE id = ?').run(Math.round(ct / delta), id); }
    } else if (tipo === 'merma') {
      delta = -(num(body.cantidad, { min: 0.001, max: 100000 }) ?? fail(400, 'Cantidad inválida'));
    } else { // ajuste: se informa el conteo físico real
      const conteo = num(body.conteo, { min: 0, max: 100000 }) ?? fail(400, 'Conteo inválido');
      delta = conteo - ins.stock;
    }
    db.prepare('UPDATE insumos SET stock = stock + ? WHERE id = ?').run(delta, id);
    db.prepare('INSERT INTO movimientos (fecha, insumo_id, tipo, cantidad, costo, usuario_id, nota) VALUES (?,?,?,?,?,?,?)')
      .run(fecha, id, tipo, delta, costo, u.id, nota);
    return db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  });
}

function rango(q) {
  const desde = isDate(q.get('desde')) ? q.get('desde') : hoy();
  const hasta = isDate(q.get('hasta')) ? q.get('hasta') : desde;
  return [desde + ' 00:00:00', hasta + ' 23:59:59', desde, hasta];
}

function ventasEn(q) {
  const [a, b] = rango(q);
  const vs = db.prepare(`SELECT v.*, u.nombre AS usuario FROM ventas v JOIN usuarios u ON u.id = v.usuario_id
                         WHERE v.fecha BETWEEN ? AND ? ORDER BY v.fecha DESC LIMIT 500`).all(a, b);
  const it = db.prepare('SELECT nombre, cantidad, precio FROM venta_items WHERE venta_id = ?');
  return vs.map(v => ({ ...v, items: it.all(v.id) }));
}

function reporte(q) {
  const [a, b, desde, hasta] = rango(q);
  const w = 'v.fecha BETWEEN ? AND ? AND v.anulada = 0';
  const tot = db.prepare(`SELECT COUNT(*) ventas, COALESCE(SUM(total),0) total FROM ventas v WHERE ${w}`).get(a, b);
  const costo = db.prepare(`SELECT COALESCE(SUM(i.costo * i.cantidad),0) c FROM venta_items i JOIN ventas v ON v.id = i.venta_id WHERE ${w}`).get(a, b).c;
  return {
    desde, hasta, ...tot, costo: Math.round(costo), margen: tot.total - Math.round(costo),
    anuladas: db.prepare('SELECT COUNT(*) n FROM ventas v WHERE v.fecha BETWEEN ? AND ? AND v.anulada = 1').get(a, b).n,
    porPago: db.prepare(`SELECT pago, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY pago ORDER BY total DESC`).all(a, b),
    porProducto: db.prepare(`SELECT i.nombre, SUM(i.cantidad) cantidad, SUM(i.cantidad * i.precio) total, ROUND(SUM(i.cantidad * i.costo)) costo
                             FROM venta_items i JOIN ventas v ON v.id = i.venta_id WHERE ${w} GROUP BY i.nombre ORDER BY total DESC`).all(a, b),
    porDia: db.prepare(`SELECT substr(fecha,1,10) dia, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY dia ORDER BY dia`).all(a, b),
    porHora: db.prepare(`SELECT substr(fecha,12,2) hora, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY hora ORDER BY hora`).all(a, b),
    porUsuario: db.prepare(`SELECT u.nombre, COUNT(*) ventas, SUM(total) total FROM ventas v JOIN usuarios u ON u.id = v.usuario_id WHERE ${w} GROUP BY u.id ORDER BY total DESC`).all(a, b),
  };
}

// Carta pública para el menú digital: precios y productos agotados
function carta() {
  const stock = new Map(db.prepare('SELECT id, stock FROM insumos').all().map(r => [r.id, r.stock]));
  const recs = db.prepare(`SELECT producto_id, insumo_id, cantidad FROM recetas WHERE variante = 'base'`).all();
  return db.prepare('SELECT id, nombre, precio, precio_combo, activo FROM productos ORDER BY orden').all().map(p => ({
    ...p, activo: !!p.activo,
    agotado: recs.filter(r => r.producto_id === p.id).some(r => (stock.get(r.insumo_id) ?? 0) < r.cantidad),
  }));
}

// ---------- rutas ----------
const rutas = [];
const ruta = (m, re, fn) => rutas.push({ m, re: new RegExp('^' + re + '$'), fn });

ruta('GET', '/api/carta', () => carta());
ruta('GET', '/api/usuarios-login', () => db.prepare('SELECT usuario, nombre FROM usuarios WHERE activo = 1 ORDER BY rol, nombre').all());
ruta('GET', '/api/sesion', ({ u }) => (requiere(u), u));
ruta('POST', '/api/login', ({ body, req, res }) => {
  const ip = req.socket.remoteAddress, t = Date.now();
  const lista = (intentos.get(ip) || []).filter(x => t - x < 60_000);
  if (lista.length >= 6) fail(429, 'Demasiados intentos. Espera un minuto.');
  const row = db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1').get(String(body?.usuario || ''));
  if (!row || !checkPin(String(body?.pin || ''), row.pin_hash)) {
    lista.push(t); intentos.set(ip, lista);
    fail(401, 'Usuario o PIN incorrecto');
  }
  intentos.delete(ip);
  const sid = randomBytes(24).toString('hex');
  sesiones.set(sid, { uid: row.id, exp: t + SESION_MS });
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}`);
  return { id: row.id, usuario: row.usuario, nombre: row.nombre, rol: row.rol };
});
ruta('POST', '/api/logout', ({ req, res }) => {
  const m = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  if (m) sesiones.delete(m[1]);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  return { ok: true };
});
ruta('GET', '/api/datos', ({ u }) => (requiere(u), datos()));
ruta('POST', '/api/ventas', ({ u, body }) => (requiere(u), registrarVenta(u, body)));
ruta('GET', '/api/ventas', ({ u, q }) => (requiere(u), ventasEn(q)));
ruta('POST', '/api/ventas/(\\d+)/anular', ({ u, p }) => (requiere(u, 'admin'), anularVenta(u, Number(p[1]))));
ruta('GET', '/api/reportes', ({ u, q }) => (requiere(u), reporte(q)));
ruta('GET', '/api/insumos/(\\d+)/movimientos', ({ u, p }) => (requiere(u), db.prepare(
  `SELECT m.*, u.nombre AS usuario FROM movimientos m LEFT JOIN usuarios u ON u.id = m.usuario_id
   WHERE insumo_id = ? ORDER BY m.id DESC LIMIT 100`).all(Number(p[1]))));
ruta('POST', '/api/insumos/(\\d+)/movimientos', ({ u, p, body }) => (requiere(u), movimientoInsumo(u, Number(p[1]), body)));
ruta('POST', '/api/insumos', ({ u, body }) => {
  requiere(u, 'admin');
  const nombre = String(body?.nombre || '').trim().slice(0, 60) || fail(400, 'Falta el nombre');
  const unidad = String(body?.unidad || 'und').trim().slice(0, 20);
  const minimo = num(body.minimo ?? 0, { min: 0, max: 100000 }) ?? fail(400, 'Mínimo inválido');
  const costo = num(body.costo ?? 0, { min: 0, max: 10_000_000 }) ?? fail(400, 'Costo inválido');
  try {
    const id = Number(db.prepare('INSERT INTO insumos (nombre, unidad, minimo, costo) VALUES (?,?,?,?)').run(nombre, unidad, minimo, costo).lastInsertRowid);
    return db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  } catch { fail(400, 'Ya existe un insumo con ese nombre'); }
});
ruta('PUT', '/api/insumos/(\\d+)', ({ u, p, body }) => {
  requiere(u, 'admin');
  const id = Number(p[1]);
  const i = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id) || fail(404, 'Insumo no encontrado');
  const nombre = body.nombre != null ? String(body.nombre).trim().slice(0, 60) || fail(400, 'Falta el nombre') : i.nombre;
  const unidad = body.unidad != null ? String(body.unidad).trim().slice(0, 20) : i.unidad;
  const minimo = body.minimo != null ? num(body.minimo, { min: 0, max: 100000 }) ?? fail(400, 'Mínimo inválido') : i.minimo;
  const costo = body.costo != null ? num(body.costo, { min: 0, max: 10_000_000 }) ?? fail(400, 'Costo inválido') : i.costo;
  const activo = body.activo != null ? (body.activo ? 1 : 0) : i.activo;
  db.prepare('UPDATE insumos SET nombre=?, unidad=?, minimo=?, costo=?, activo=? WHERE id=?').run(nombre, unidad, minimo, costo, activo, id);
  return db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
});
ruta('PUT', '/api/productos/([a-z0-9-]+)', ({ u, p, body }) => {
  requiere(u, 'admin');
  const pr = db.prepare('SELECT * FROM productos WHERE id = ?').get(p[1]) || fail(404, 'Producto no encontrado');
  const precio = body.precio != null ? num(body.precio, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Precio inválido') : pr.precio;
  let pc = pr.precio_combo;
  if (body.precio_combo !== undefined) pc = body.precio_combo === null || body.precio_combo === '' ? null
    : num(body.precio_combo, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Precio de combo inválido');
  const activo = body.activo != null ? (body.activo ? 1 : 0) : pr.activo;
  db.prepare('UPDATE productos SET precio=?, precio_combo=?, activo=? WHERE id=?').run(precio, pc, activo, pr.id);
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(pr.id);
});
ruta('PUT', '/api/productos/([a-z0-9-]+)/receta', ({ u, p, body }) => {
  requiere(u, 'admin');
  db.prepare('SELECT id FROM productos WHERE id = ?').get(p[1]) || fail(404, 'Producto no encontrado');
  const ok = id => db.prepare('SELECT id FROM insumos WHERE id = ?').get(id);
  return tx(() => {
    db.prepare('DELETE FROM recetas WHERE producto_id = ?').run(p[1]);
    const ins = db.prepare('INSERT INTO recetas (producto_id, insumo_id, variante, cantidad) VALUES (?,?,?,?)');
    for (const variante of ['base', 'combo']) for (const r of (body?.[variante] || [])) {
      const iid = num(r.insumo_id, { min: 1, int: true }); const q = num(r.cantidad, { min: 0.001, max: 1000 });
      if (!iid || !ok(iid) || q == null) fail(400, 'Receta inválida');
      ins.run(p[1], iid, variante, q);
    }
    return db.prepare('SELECT * FROM recetas WHERE producto_id = ?').all(p[1]);
  });
});
ruta('GET', '/api/usuarios', ({ u }) => (requiere(u, 'admin'), db.prepare('SELECT id, usuario, nombre, rol, activo FROM usuarios').all()));
ruta('PUT', '/api/usuarios/(\\d+)/pin', ({ u, p, body }) => {
  requiere(u);
  const id = Number(p[1]);
  if (u.rol !== 'admin' && u.id !== id) fail(403, 'Solo puedes cambiar tu propio PIN');
  const pin = String(body?.pin || '');
  if (!/^\d{4,8}$/.test(pin)) fail(400, 'El PIN debe tener de 4 a 8 números');
  db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(hashPin(pin), id);
  return { ok: true };
});

// ---------- estáticos ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

async function estatico(res, root, rel) {
  const file = normalize(join(root, decodeURIComponent(rel)));
  if (!file.startsWith(root)) return false;              // evita salir de la carpeta (../)
  let f = file;
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { return false; }
  try {
    const data = await readFile(f);
    if (f.includes('_poster')) return false;
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream',
      'Cache-Control': /\.(glb|webp|ttf|svg)$/.test(f) ? 'public, max-age=86400' : 'no-cache' });
    res.end(data);
    return true;
  } catch { return false; }
}

// ---------- servidor ----------
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    if (url.pathname.startsWith('/api/')) {
      // las escrituras deben venir del mismo origen (protección CSRF)
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) fail(403, 'Origen no permitido');
      const r = rutas.find(r => r.m === req.method && r.re.test(url.pathname)) || fail(404, 'No encontrado');
      let body = null;
      if (req.method !== 'GET') {
        let raw = '';
        for await (const c of req) { raw += c; if (raw.length > 100_000) fail(413, 'Solicitud muy grande'); }
        try { body = raw ? JSON.parse(raw) : {}; } catch { fail(400, 'JSON inválido'); }
      }
      const out = r.fn({ req, res, body, q: url.searchParams, p: url.pathname.match(r.re), u: usuarioDe(req) });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(out));
    }
    if (url.pathname === '/caja') { res.writeHead(301, { Location: '/caja/' }); return res.end(); }
    if (url.pathname.startsWith('/caja/') && await estatico(res, ROOT_APP, url.pathname.slice(6))) return;
    if (!url.pathname.startsWith('/caja/') && await estatico(res, ROOT_MENU, url.pathname.slice(1))) return;
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: status === 500 ? 'Error interno' : e.message }));
  }
}).listen(PORT, () => {
  const ips = Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log(`
  La Central lista. Deja esta ventana abierta.
`);
  console.log(`  En este computador:   menú  http://localhost:${PORT}/      caja  http://localhost:${PORT}/caja/`);
  for (const ip of ips) console.log(`  Celular (mismo WiFi): menú  http://${ip}:${PORT}/   caja  http://${ip}:${PORT}/caja/`);
  console.log('');
}).on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `
  El puerto ${PORT} ya está en uso: probablemente la caja ya está abierta en otra ventana.
` : e);
  process.exit(1);
});
