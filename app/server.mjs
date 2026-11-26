// La Central Café — servidor de caja/inventario + menú digital.
// Uso: node server.mjs   (PORT=3000 por defecto)
//   /        -> menú digital (carpeta ../menu)
//   /caja/   -> app de ventas e inventario
//   /api/... -> API JSON
import { createServer } from 'node:http';
import { readFile, stat, unlink } from 'node:fs/promises';
import { readdirSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { db, seed, migrar, respaldoDiario, hashPin, checkPin, ajuste, cerrarBase } from './db.mjs';
import { createRequire } from 'node:module';

// generador de QR (librería qrcode, MIT, copiada en vendor/ para no depender de internet)
const requireLocal = createRequire(import.meta.url);
const QR = requireLocal('./vendor/qrcode/lib/core/qrcode.js');
const QRsvg = requireLocal('./vendor/qrcode/lib/renderer/svg-tag.js');

const PORT = Number(process.env.PORT || 3000);
const ROOT_MENU = fileURLToPath(new URL('../menu/', import.meta.url));
const ROOT_APP = fileURLToPath(new URL('./public/', import.meta.url));
const PAGOS = ['efectivo', 'nequi', 'daviplata', 'tarjeta'];
const TRAS_PROXY = process.env.TRAS_PROXY === '1';   // en Render/hosting: la IP y https vienen del proxy

if (seed()) console.log('Base de datos creada con datos iniciales (data/lacentral.db)');
migrar();
try { const r = respaldoDiario(); if (r) console.log('  Respaldo del día: ' + r); } catch (e) { console.error('  No se pudo hacer el respaldo diario:', e.message); }
setInterval(() => { try { respaldoDiario(); } catch {} }, 3600_000).unref();

// ---------- utilidades ----------
const fmtBogota = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Bogota',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});
const ahora = (d = new Date()) => fmtBogota.format(d);
const hoy = () => ahora().slice(0, 10);
const fmtDiaHora = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: '2-digit', hour12: false });
// parrilla: jueves, viernes y sábado de 4:00 pm a 9:59 pm (hora Colombia) — igual que el menú
function esHoraParrilla(d = new Date()) {
  if (process.env.LACENTRAL_MODO === 'parrilla') return true;
  if (process.env.LACENTRAL_MODO === 'cafe') return false;
  const p = Object.fromEntries(fmtDiaHora.formatToParts(d).map(x => [x.type, x.value]));
  const h = Number(p.hour) % 24;
  return ['Thu', 'Fri', 'Sat'].includes(p.weekday) && h >= 16 && h < 22;
}
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const num = (v, { min = -Infinity, max = Infinity, int = false } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) return null;
  return n;
};
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const texto = (v, max) => (v == null ? '' : String(v)).trim().slice(0, max);
const modelos = () => { try { return readdirSync(join(ROOT_MENU, 'models')).filter(f => f.endsWith('.glb')).map(f => f.slice(0, -4)).sort(); } catch { return []; } };

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- sesiones (persistentes en SQLite; expiran a las 12 h) ----------
const SESION_MS = 12 * 3600 * 1000;
const intentos = new Map(); // ip -> [timestamps] para frenar adivinar PINs
const fallosUsuario = new Map(); // usuario -> [timestamps]: 30 fallos en 1 h bloquean ese usuario hasta que pase la hora
const feedbackIntentos = new Map(); // ip -> [timestamps] para frenar spam en feedback
const tarjetaIntentos = new Map(); // ip -> [timestamps] para frenar que creen/consulten tarjetas en masa
const topeGlobal = new Map();      // tipo -> [timestamps] de la última hora, sumando todas las IP
function limiteGlobal(tipo, max) {
  const t = Date.now(), xs = (topeGlobal.get(tipo) || []).filter(x => t - x < 3600_000);
  if (xs.length >= max) fail(429, 'Hay demasiada actividad en este momento. Intenta más tarde.');
  xs.push(t); topeGlobal.set(tipo, xs);
}

function clientIp(req) {
  return (TRAS_PROXY && String(req.headers['x-forwarded-for'] || '').split(',').pop().trim()) || req.socket.remoteAddress || 'local';
}
function limpiarLimites() {
  const ahoraMs = Date.now();
  db.prepare('DELETE FROM sesiones WHERE exp < ?').run(ahoraMs);
  for (const [k, xs] of intentos) {
    const f = xs.filter(t => ahoraMs - t < 60_000);
    if (f.length) intentos.set(k, f); else intentos.delete(k);
  }
  for (const [k, xs] of fallosUsuario) {
    const f = xs.filter(t => ahoraMs - t < 3600_000);
    if (f.length) fallosUsuario.set(k, f); else fallosUsuario.delete(k);
  }
  for (const [k, xs] of tarjetaIntentos) {
    const f = xs.filter(t => ahoraMs - t < 600_000);
    if (f.length) tarjetaIntentos.set(k, f); else tarjetaIntentos.delete(k);
  }
  for (const [k, xs] of feedbackIntentos) {
    const f = xs.filter(t => ahoraMs - t < 600_000);
    if (f.length) feedbackIntentos.set(k, f); else feedbackIntentos.delete(k);
  }
}
setInterval(limpiarLimites, 600_000).unref();

function usuarioDe(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  if (!m) return null;
  const now = Date.now();
  const row = db.prepare(`SELECT u.id, u.usuario, u.nombre, u.rol, s.exp
                          FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
                          WHERE s.token = ? AND u.activo = 1`).get(m[1]);
  if (!row || row.exp < now) {
    if (row) db.prepare('DELETE FROM sesiones WHERE token = ?').run(m[1]);
    return null;
  }
  db.prepare('UPDATE sesiones SET exp = ? WHERE token = ?').run(now + SESION_MS, m[1]);
  return { id: row.id, usuario: row.usuario, nombre: row.nombre, rol: row.rol };
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
    categorias: db.prepare('SELECT * FROM categorias ORDER BY orden').all(),
    modelos: modelos(),
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
    if (!(precio > 0)) fail(400, `${p.nombre} aún no tiene precio`);
    const rec = receta(p.id, variante);
    const costo = rec.reduce((a, r) => a + r.cantidad * r.costo, 0);
    return { p, variante, cantidad, precio, rec, costo };
  });
  const subtotal = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);
  const premio = body.premio ? (['cafe', 'descuento'].includes(body.premio) ? body.premio : fail(400, 'Premio inválido')) : null;
  const propina = body.propina == null || body.propina === ''
    ? 0 : (num(body.propina, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Propina inválida'));
  const mesa = texto(body.mesa, 30) || 'Caja';
  let recibidoPre = null;
  if (pago === 'efectivo' && body.recibido != null && body.recibido !== '') {
    recibidoPre = num(body.recibido, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Monto recibido inválido');
  }

  return tx(() => {
    // validar cliente y saldo dentro de la transacción (BEGIN IMMEDIATE) para evitar doble canje concurrente
    const cliente = body.cliente ? (buscarCliente(body.cliente) || fail(400, 'Cliente no encontrado')) : null;
    let descuento = 0;
    if (premio) {
      if (!cliente) fail(400, 'El premio necesita el cliente');
      if (saldoSellos(cliente.id) < SELLOS_META) fail(400, 'El cliente aún no completa la tarjeta');
      if (premio === 'cafe') {
        const cafes = lineas.filter(l => l.p.categoria === 'cafes');
        if (!cafes.length) fail(400, 'Agrega a la cuenta el café del premio');
        descuento = Math.max(...cafes.map(l => l.precio));
      } else descuento = Math.round(subtotal * PREMIO_DESCUENTO / 100);
    }
    const total = subtotal - descuento + propina;
    const recibido = recibidoPre;
    if (recibido != null && recibido < total) fail(400, 'El efectivo recibido es menor al total');

    const fecha = ahora();
    const ventaId = Number(db.prepare('INSERT INTO ventas (fecha, usuario_id, total, pago, recibido, mesa, propina, cliente_id, descuento, premio) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(fecha, u.id, total, pago, recibido, mesa, propina, cliente?.id ?? null, descuento, premio).lastInsertRowid);
    if (cliente) {
      const ms = db.prepare('INSERT INTO sellos (cliente_id, venta_id, fecha, cantidad, tipo, icono) VALUES (?,?,?,?,?,?)');
      const icono = esHoraParrilla() ? 'fuego' : 'cafe';
      if (premio) ms.run(cliente.id, ventaId, fecha, -SELLOS_META, 'canje', icono);
      ms.run(cliente.id, ventaId, fecha, 1, 'sello', icono);
    }
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
    if (body.comanda_id != null && body.comanda_id !== '') {
      const cid = num(body.comanda_id, { min: 1, int: true }) ?? fail(400, 'Comanda inválida');
      db.prepare(`UPDATE comandas SET estado = 'cobrado' WHERE id = ?`).run(cid);
    }
    const alertas = db.prepare('SELECT nombre, stock, minimo, unidad FROM insumos WHERE activo = 1 AND stock <= minimo ORDER BY stock').all();
    const tarjeta = cliente ? { nombre: cliente.nombre, sellos: saldoSellos(cliente.id), meta: SELLOS_META, iconos: iconosSellos(cliente.id) } : null;
    return { id: ventaId, fecha, mesa, subtotal, descuento, premio, propina, total, tarjeta, cambio: recibido != null ? recibido - total : null, alertas };
  });
}

// ---------- tarjeta de sellos ----------
const SELLOS_META = 8;          // sellos para el premio
const PREMIO_DESCUENTO = 10;    // % de descuento si el cliente escoge descuento en vez del café gratis
// celular colombiano: solo dígitos, sin el 57 de adelante
const celular = v => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^\d{7,10}$/.test(d) ? d : null;
};
const saldoSellos = id => db.prepare('SELECT COALESCE(SUM(cantidad), 0) n FROM sellos WHERE cliente_id = ?').get(id).n;
// iconos de los sellos que están puestos en la tarjeta actual (los más recientes), en orden de compra
function iconosSellos(id) {
  const n = Math.max(0, Math.min(saldoSellos(id), SELLOS_META));
  if (!n) return [];
  return db.prepare(`SELECT icono FROM sellos WHERE cliente_id = ? AND tipo = 'sello' ORDER BY id DESC LIMIT ?`)
    .all(id, n).map(r => r.icono || 'cafe').reverse();
}
function buscarCliente(q) {
  const s = String(q).trim();
  if (/^[a-f0-9]{32}$/.test(s)) return db.prepare('SELECT * FROM clientes WHERE token = ?').get(s);
  const tel = celular(s);
  return tel ? db.prepare('SELECT * FROM clientes WHERE telefono = ?').get(tel) : undefined;
}
function tarjetaDe(c) {
  const sellos = saldoSellos(c.id);
  return {
    token: c.token, nombre: c.nombre, sellos, meta: SELLOS_META, premio: sellos >= SELLOS_META, descuento: PREMIO_DESCUENTO,
    iconos: iconosSellos(c.id),
    telefono: c.telefono.slice(0, 3) + ' *** ' + c.telefono.slice(-4),
    historial: db.prepare('SELECT fecha, cantidad, tipo, icono FROM sellos WHERE cliente_id = ? ORDER BY id DESC LIMIT 6').all(c.id),
  };
}
function limitarTarjeta(req, max) {
  const ip = clientIp(req), t = Date.now();
  const lista = (tarjetaIntentos.get(ip) || []).filter(x => t - x < 600_000);
  if (lista.length >= max) fail(429, 'Demasiados intentos. Intenta en unos minutos.');
  lista.push(t); tarjetaIntentos.set(ip, lista);
}

function anularVenta(u, id) {
  const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id) || fail(404, 'Venta no encontrada');
  if (v.anulada) fail(400, 'La venta ya estaba anulada');
  return tx(() => {
    const fecha = ahora();
    db.prepare('UPDATE ventas SET anulada = 1 WHERE id = ?').run(id);
    db.prepare('DELETE FROM sellos WHERE venta_id = ?').run(id);   // se devuelven el sello y, si hubo, el premio
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
  const tot = db.prepare(`SELECT COUNT(*) ventas, COALESCE(SUM(total),0) total, COALESCE(SUM(propina),0) propinas FROM ventas v WHERE ${w}`).get(a, b);
  const costo = db.prepare(`SELECT COALESCE(SUM(i.costo * i.cantidad),0) c FROM venta_items i JOIN ventas v ON v.id = i.venta_id WHERE ${w}`).get(a, b).c;
  return {
    desde, hasta, ...tot, costo: Math.round(costo), margen: (tot.total - tot.propinas) - Math.round(costo),
    anuladas: db.prepare('SELECT COUNT(*) n FROM ventas v WHERE v.fecha BETWEEN ? AND ? AND v.anulada = 1').get(a, b).n,
    porPago: db.prepare(`SELECT pago, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY pago ORDER BY total DESC`).all(a, b),
    porProducto: db.prepare(`SELECT i.nombre, SUM(i.cantidad) cantidad, SUM(i.cantidad * i.precio) total, ROUND(SUM(i.cantidad * i.costo)) costo
                             FROM venta_items i JOIN ventas v ON v.id = i.venta_id WHERE ${w} GROUP BY i.nombre ORDER BY total DESC`).all(a, b),
    porDia: db.prepare(`SELECT substr(fecha,1,10) dia, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY dia ORDER BY dia`).all(a, b),
    porHora: db.prepare(`SELECT substr(fecha,12,2) hora, COUNT(*) ventas, SUM(total) total FROM ventas v WHERE ${w} GROUP BY hora ORDER BY hora`).all(a, b),
    porUsuario: db.prepare(`SELECT u.nombre, COUNT(*) ventas, SUM(total) total FROM ventas v JOIN usuarios u ON u.id = v.usuario_id WHERE ${w} GROUP BY u.id ORDER BY total DESC`).all(a, b),
  };
}

// Carta pública para el menú digital: secciones, productos, precios y agotados (todo sale de la caja)
function carta() {
  const stock = new Map(db.prepare('SELECT id, stock FROM insumos').all().map(r => [r.id, r.stock]));
  const nombreIns = new Map(db.prepare('SELECT id, nombre FROM insumos').all().map(r => [r.id, r.nombre]));
  const recs = db.prepare('SELECT producto_id, insumo_id, cantidad, variante FROM recetas').all();
  const conModelo = new Set(modelos());
  const agotado = (pid, v) => recs.filter(r => r.producto_id === pid && (r.variante === 'base' || r.variante === v))
    .some(r => (stock.get(r.insumo_id) ?? 0) < r.cantidad);
  const prods = db.prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY orden, nombre').all();
  const secciones = [];
  for (const c of db.prepare('SELECT * FROM categorias ORDER BY orden').all()) {
    const items = prods.filter(p => p.categoria === c.id).map(p => ({
      id: p.id, nombre: p.nombre, precio: p.precio, combo: p.precio_combo ?? null, desc: p.descripcion || '',
      model: p.modelo && conModelo.has(p.modelo) ? p.modelo : null,
      agotado: agotado(p.id, 'base'), comboAgotado: p.precio_combo != null && agotado(p.id, 'combo'),
      comboIncluye: recs.filter(r => r.producto_id === p.id && r.variante === 'combo').map(r => '+' + (nombreIns.get(r.insumo_id) || '').toLowerCase()),
    }));
    if (!items.length) continue;
    let sec = secciones.find(x => x.titulo === c.seccion);
    if (!sec) secciones.push(sec = { id: slug(c.seccion), titulo: c.seccion, bloques: [] });
    sec.bloques.push({ tipo: c.tipo, id: slug(c.id), subtitulo: c.tipo === 'lista' ? c.nombre : null, horario: c.horario || 'siempre', items });
  }
  const whatsapp = String(process.env.WHATSAPP_PEDIDOS || '').replace(/\D/g, '');
  return { secciones, ...(whatsapp ? { whatsapp } : {}) };
}

function guardarProducto(body, actual) {
  const nombre = body.nombre !== undefined ? texto(body.nombre, 50) || fail(400, 'Falta el nombre') : actual.nombre;
  const categoria = body.categoria !== undefined ? String(body.categoria) : actual.categoria;
  if (!db.prepare('SELECT id FROM categorias WHERE id = ?').get(categoria)) fail(400, 'Categoría inválida');
  const precio = body.precio !== undefined ? num(body.precio, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Precio inválido') : actual.precio;
  if (precio == null) fail(400, 'Falta el precio');
  let pc = actual.precio_combo ?? null;
  if (body.precio_combo !== undefined) pc = body.precio_combo === null || body.precio_combo === '' ? null
    : num(body.precio_combo, { min: 0, max: 10_000_000, int: true }) ?? fail(400, 'Precio de combo inválido');
  const descripcion = body.descripcion !== undefined ? texto(body.descripcion, 300) || null : actual.descripcion;
  let modelo = actual.modelo ?? null;
  if (body.modelo !== undefined) {
    modelo = body.modelo ? String(body.modelo) : null;
    if (modelo && !modelos().includes(modelo)) fail(400, 'Modelo 3D no encontrado');
  }
  const activo = body.activo !== undefined ? (body.activo ? 1 : 0) : actual.activo;
  return { nombre, categoria, precio, precio_combo: pc, descripcion, modelo, activo };
}

// ---------- comandas (pedidos de mesas / cocina) ----------
function listarComandas() {
  const cs = db.prepare(`SELECT * FROM comandas WHERE estado != 'archivado' ORDER BY id DESC LIMIT 100`).all();
  const getItems = db.prepare(`SELECT * FROM comanda_items WHERE comanda_id = ?`);
  return cs.map(c => ({ ...c, items: getItems.all(c.id) }));
}

function guardarItemsComanda(cid, items) {
  let total = 0;
  const insItem = db.prepare(
    `INSERT INTO comanda_items (comanda_id, producto_id, nombre, variante, cantidad, precio, notas) VALUES (?,?,?,?,?,?,?)`
  );
  for (const it of items) {
    const pid = String(it.id || it.producto_id || '');
    const pr = db.prepare('SELECT nombre, precio, precio_combo FROM productos WHERE id = ? AND activo = 1').get(pid) || fail(400, 'Producto no disponible');
    const variante = it.variante === 'combo' ? 'combo' : 'base';
    if (variante === 'combo' && !pr.precio_combo) fail(400, `${pr.nombre} no tiene combo`);
    const nombre = pr.nombre + (variante === 'combo' ? ' (combo)' : '');
    const precio = variante === 'combo' ? pr.precio_combo : pr.precio;
    if (!(precio > 0)) fail(400, `${pr.nombre} aún no tiene precio`);
    const cant = num(it.cantidad, { min: 1, max: 99, int: true }) ?? fail(400, 'Cantidad inválida');
    total += precio * cant;
    insItem.run(cid, pid, nombre, variante, cant, precio, texto(it.notas, 150));
  }
  return total;
}

function crearComanda(body) {
  const mesa = texto(body?.mesa, 20) || 'Mesa 1';
  const cliente = texto(body?.cliente, 60) || '';
  const notas = texto(body?.notas, 300) || '';
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 60) fail(400, 'La comanda debe incluir al menos un producto');

  return tx(() => {
    const fecha = ahora();
    const cid = Number(db.prepare(
      `INSERT INTO comandas (mesa, cliente, fecha, estado, total, notas) VALUES (?,?,?, 'pendiente', 0, ?)`
    ).run(mesa, cliente, fecha, notas).lastInsertRowid);
    const total = guardarItemsComanda(cid, items);
    db.prepare('UPDATE comandas SET total = ? WHERE id = ?').run(total, cid);
    const getItems = db.prepare(`SELECT * FROM comanda_items WHERE comanda_id = ?`);
    return { id: cid, mesa, cliente, fecha, estado: 'pendiente', total, items: getItems.all(cid), notas };
  });
}

function actualizarComanda(id, body) {
  const c = db.prepare('SELECT * FROM comandas WHERE id = ?').get(id) || fail(404, 'Comanda no encontrada');
  const estado = ['pendiente', 'preparando', 'listo', 'entregado', 'cobrado', 'archivado'].includes(body?.estado)
    ? body.estado : c.estado;
  const mesa = body?.mesa != null ? (texto(body.mesa, 20) || c.mesa) : c.mesa;
  const notas = body?.notas !== undefined ? texto(body.notas, 300) : c.notas;
  return tx(() => {
    let total = c.total;
    if (Array.isArray(body?.items)) {
      if (!body.items.length || body.items.length > 60) fail(400, 'La comanda debe incluir al menos un producto');
      db.prepare('DELETE FROM comanda_items WHERE comanda_id = ?').run(id);
      total = guardarItemsComanda(id, body.items);
    }
    db.prepare('UPDATE comandas SET estado = ?, mesa = ?, notas = ?, total = ? WHERE id = ?').run(estado, mesa, notas, total, id);
    const getItems = db.prepare(`SELECT * FROM comanda_items WHERE comanda_id = ?`);
    return { ...db.prepare('SELECT * FROM comandas WHERE id = ?').get(id), items: getItems.all(id) };
  });
}

// ---------- rutas ----------
const rutas = [];
const ruta = (m, re, fn) => rutas.push({ m, re: new RegExp('^' + re + '$'), fn });

ruta('GET', '/api/carta', () => carta());
ruta('GET', '/api/comandas', ({ u }) => (requiere(u), listarComandas()));
ruta('POST', '/api/comandas', ({ u, body }) => (requiere(u), crearComanda(body)));
ruta('PUT', '/api/comandas/(\\d+)', ({ u, p, body }) => (requiere(u), actualizarComanda(Number(p[1]), body)));
ruta('DELETE', '/api/comandas/(\\d+)', ({ u, p }) => {
  requiere(u);
  db.prepare(`UPDATE comandas SET estado = 'archivado' WHERE id = ?`).run(Number(p[1]));
  return { ok: true };
});
ruta('GET', '/api/feedback', ({ u }) => {
  requiere(u);
  return db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 100').all();
});
ruta('POST', '/api/feedback', ({ body, req }) => {
  const ip = clientIp(req), t = Date.now();
  const lista = (feedbackIntentos.get(ip) || []).filter(x => t - x < 600_000);
  if (lista.length >= 5) fail(429, 'Demasiadas opiniones enviadas. Intenta más tarde.');
  limiteGlobal('feedback', 300);
  lista.push(t); feedbackIntentos.set(ip, lista);
  const estrellas = num(body?.estrellas, { min: 1, max: 5, int: true }) || 5;
  const comentario = texto(body?.comentario, 500) || '';
  const mesa = texto(body?.mesa, 30) || 'Mesa';
  const cliente = texto(body?.cliente, 60) || '';
  const fecha = ahora();
  db.prepare('INSERT INTO feedback (fecha, estrellas, comentario, mesa, cliente) VALUES (?,?,?,?,?)')
    .run(fecha, estrellas, comentario, mesa, cliente);
  return { ok: true, estrellas, fecha };
});
// el cliente saca su tarjeta con su celular y nombre; si ya la tenía (otro celular, borró datos) se le devuelve la misma
ruta('POST', '/api/tarjeta', ({ body, req }) => {
  limitarTarjeta(req, 10);
  const tel = celular(body?.telefono) || fail(400, 'Escribe tu número de celular');
  const nombre = texto(body?.nombre, 30).split(/\s+/)[0] || fail(400, 'Escribe tu nombre');
  let c = db.prepare('SELECT * FROM clientes WHERE telefono = ?').get(tel);
  if (!c) limiteGlobal('tarjeta', 300);
  const base = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (c && base(c.nombre) !== base(nombre)) fail(400, 'Ese celular ya tiene tarjeta con otro nombre. Escribe el nombre con el que la sacaste.');
  if (!c) {
    db.prepare('INSERT INTO clientes (telefono, nombre, token, creado) VALUES (?,?,?,?)').run(tel, nombre, randomBytes(16).toString('hex'), ahora());
    c = db.prepare('SELECT * FROM clientes WHERE telefono = ?').get(tel);
  }
  return tarjetaDe(c);
});
ruta('GET', '/api/tarjeta/([a-f0-9]{32})', ({ p }) => tarjetaDe(db.prepare('SELECT * FROM clientes WHERE token = ?').get(p[1]) || fail(404, 'Tarjeta no encontrada')));
// caja: buscar al cliente por celular o por el código del QR de su tarjeta
ruta('GET', '/api/clientes', ({ u, q }) => {
  requiere(u);
  const c = buscarCliente(q.get('q') || '') || fail(404, 'No hay tarjeta con ese número');
  return { ...tarjetaDe(c), id: c.id, telefono_completo: c.telefono };
});
// caja: todos los clientes con su saldo, y la historia de uno
ruta('GET', '/api/clientes/lista', ({ u }) => {
  requiere(u);
  const clientes = db.prepare(`SELECT c.id, c.nombre, c.telefono, c.creado, COALESCE(SUM(s.cantidad), 0) sellos,
      COALESCE(SUM(s.tipo = 'sello'), 0) compras, COALESCE(SUM(s.tipo = 'canje'), 0) canjes, MAX(s.fecha) ultima
    FROM clientes c LEFT JOIN sellos s ON s.cliente_id = c.id GROUP BY c.id ORDER BY ultima IS NULL, ultima DESC, c.id DESC`).all();
  const mes = hoy().slice(0, 7);
  const r = db.prepare(`SELECT COALESCE(SUM(tipo = 'sello'), 0) sellos, COALESCE(SUM(tipo = 'canje'), 0) canjes FROM sellos WHERE substr(fecha, 1, 7) = ?`).get(mes);
  return { meta: SELLOS_META, descuento: PREMIO_DESCUENTO, mes: { sellos: r.sellos, canjes: r.canjes },
    clientes: clientes.map(c => ({ ...c, premio: c.sellos >= SELLOS_META })) };
});
ruta('GET', '/api/clientes/(\\d+)', ({ u, p }) => {
  requiere(u);
  const c = db.prepare('SELECT id, nombre, telefono, creado FROM clientes WHERE id = ?').get(Number(p[1])) || fail(404, 'Cliente no encontrado');
  const historial = db.prepare(`SELECT s.fecha, s.tipo, s.cantidad, s.icono, v.id venta_id, v.total, v.premio, v.descuento
    FROM sellos s LEFT JOIN ventas v ON v.id = s.venta_id WHERE s.cliente_id = ? ORDER BY s.id DESC LIMIT 60`).all(c.id);
  return { ...c, sellos: saldoSellos(c.id), meta: SELLOS_META, iconos: iconosSellos(c.id), historial };
});
ruta('GET', '/api/usuarios-login', () => db.prepare('SELECT usuario, nombre FROM usuarios WHERE activo = 1 ORDER BY rol, nombre').all());
ruta('GET', '/api/sesion', ({ u }) => (requiere(u), u));
ruta('POST', '/api/login', ({ body, req, res }) => {
  const ip = clientIp(req), t = Date.now();
  const lista = (intentos.get(ip) || []).filter(x => t - x < 60_000);
  if (lista.length >= 6) fail(429, 'Demasiados intentos. Espera un minuto.');
  const usuario = String(body?.usuario || '').slice(0, 40);
  const fu = (fallosUsuario.get(usuario) || []).filter(x => t - x < 3600_000);
  if (fu.length >= 30) fail(429, 'Este usuario quedó bloqueado un rato por muchos intentos fallidos.');
  const row = db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1').get(usuario);
  if (!row || !checkPin(String(body?.pin || ''), row.pin_hash)) {
    lista.push(t); intentos.set(ip, lista);
    fu.push(t); fallosUsuario.set(usuario, fu);
    fail(401, 'Usuario o PIN incorrecto');
  }
  intentos.delete(ip); fallosUsuario.delete(usuario);
  const sid = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sesiones (token, usuario_id, exp) VALUES (?,?,?)').run(sid, row.id, t + SESION_MS);
  const segura = TRAS_PROXY && req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESION_MS / 1000}${segura}`);
  return { id: row.id, usuario: row.usuario, nombre: row.nombre, rol: row.rol };
});
ruta('POST', '/api/logout', ({ req, res }) => {
  const m = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  if (m) db.prepare('DELETE FROM sesiones WHERE token = ?').run(m[1]);
  const segura = TRAS_PROXY && req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${segura}`);
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
ruta('POST', '/api/productos', ({ u, body }) => {
  requiere(u, 'admin');
  const v = guardarProducto(body || {}, { activo: 1, precio_combo: null, descripcion: null, modelo: null });
  const base = slug(v.nombre) || fail(400, 'Nombre inválido');
  let id = base;
  for (let n = 2; db.prepare('SELECT 1 FROM productos WHERE id = ?').get(id); n++) id = base + '-' + n;
  const orden = db.prepare('SELECT COALESCE(MAX(orden), 0) + 1 o FROM productos').get().o;
  db.prepare('INSERT INTO productos (id, nombre, categoria, precio, precio_combo, descripcion, modelo, activo, orden) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, v.nombre, v.categoria, v.precio, v.precio_combo, v.descripcion, v.modelo, v.activo, orden);
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
});
ruta('PUT', '/api/productos/([a-z0-9-]+)', ({ u, p, body }) => {
  requiere(u, 'admin');
  const pr = db.prepare('SELECT * FROM productos WHERE id = ?').get(p[1]) || fail(404, 'Producto no encontrado');
  const v = guardarProducto(body || {}, pr);
  db.prepare('UPDATE productos SET nombre=?, categoria=?, precio=?, precio_combo=?, descripcion=?, modelo=?, activo=? WHERE id=?')
    .run(v.nombre, v.categoria, v.precio, v.precio_combo, v.descripcion, v.modelo, v.activo, pr.id);
  return db.prepare('SELECT * FROM productos WHERE id = ?').get(pr.id);
});
ruta('POST', '/api/categorias', ({ u, body }) => {
  requiere(u, 'admin');
  const nombre = texto(body?.nombre, 30) || fail(400, 'Falta el nombre');
  const seccion = texto(body?.seccion, 30).toLowerCase() || fail(400, 'Falta la sección');
  const tipo = body?.tipo === 'destacado' ? 'destacado' : 'lista';
  const horario = ['dia', 'noche', 'siempre'].includes(body?.horario) ? body.horario : 'siempre';
  const id = slug(nombre) || fail(400, 'Nombre inválido');
  if (db.prepare('SELECT 1 FROM categorias WHERE id = ?').get(id)) fail(400, 'Ya existe esa categoría');
  const orden = db.prepare('SELECT COALESCE(MAX(orden), 0) + 1 o FROM categorias').get().o;
  db.prepare('INSERT INTO categorias (id, nombre, seccion, tipo, orden, horario) VALUES (?,?,?,?,?,?)').run(id, nombre, seccion, tipo, orden, horario);
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
});
ruta('GET', '/api/qr', ({ u, q }) => {
  requiere(u, 'admin');
  let base;
  try { base = new URL(q.get('url') || ''); } catch { fail(400, 'Dirección del menú inválida'); }
  if (!/^https?:$/.test(base.protocol) || base.href.length > 200) fail(400, 'Dirección del menú inválida');
  if (base.hostname === 'localhost' || base.hostname === '127.0.0.1') {
    const ip = Object.values(networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal)?.address;
    if (ip) base.hostname = ip;
  }
  if (q.get('tipo') === 'tarjeta') {
    const url = new URL('tarjeta', base.href.replace(/\/?$/, '/'));
    const svg = QRsvg.render(QR.create(url.href, { errorCorrectionLevel: 'M' }), { margin: 0, color: { dark: '#000000ff', light: '#ffffffff' } });
    return [{ tipo: 'tarjeta', titulo: 'tarjeta de sellos', subtitulo: 'escanea y saca tu tarjeta · 8 sellos = premio', url: url.href, svg }];
  }
  const mesas = num(q.get('mesas'), { min: 1, max: 60, int: true }) ?? fail(400, 'Número de mesas inválido (1 a 60)');
  return Array.from({ length: mesas }, (_, i) => {
    const url = new URL(base); url.searchParams.set('mesa', i + 1);
    const svg = QRsvg.render(QR.create(url.href, { errorCorrectionLevel: 'M' }), { margin: 0, color: { dark: '#000000ff', light: '#ffffffff' } });
    return { mesa: i + 1, url: url.href, svg };
  });
});
ruta('GET', '/api/respaldo', ({ u }) => {
  requiere(u, 'admin');
  const f = join(tmpdir(), `lacentral-respaldo-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
  ajuste.set('ultimo_respaldo_descargado', ahora());
  return { __archivo: f, nombre: `lacentral-respaldo-${hoy()}.db` };
});
// el dueño ve un aviso si lleva más de 7 días sin bajar una copia a su computador
ruta('GET', '/api/respaldo/estado', ({ u }) => {
  requiere(u, 'admin');
  const ultimo = ajuste.get('ultimo_respaldo_descargado');
  const dias = ultimo ? Math.floor((Date.parse(hoy()) - Date.parse(ultimo.slice(0, 10))) / 86400000) : null;
  return { ultimo, dias, pendiente: dias === null || dias > 7 };
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
ruta('PUT', '/api/usuarios/(\\d+)/pin', ({ u, p, body, req }) => {
  requiere(u);
  const id = Number(p[1]);
  if (u.rol !== 'admin' && u.id !== id) fail(403, 'Solo puedes cambiar tu propio PIN');
  const pin = String(body?.pin || '');
  if (!/^\d{4,8}$/.test(pin)) fail(400, 'El PIN debe tener de 4 a 8 números');
  const destino = db.prepare('SELECT rol FROM usuarios WHERE id = ?').get(id) || fail(404, 'Usuario no encontrado');
  if (destino.rol === 'admin' && pin.length < 6) fail(400, 'El PIN del dueño debe tener al menos 6 números');
  // PIN fáciles de adivinar: todos iguales (1111) o seguidos (1234, 9876)
  const seguidos = d => [...pin].every((c, i) => i === 0 || +c === (+pin[i - 1] + d + 10) % 10);
  if (/^(\d)\1+$/.test(pin) || seguidos(1) || seguidos(-1)) fail(400, 'Ese PIN es muy fácil de adivinar. Usa otro.');
  db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(hashPin(pin), id);
  // al cambiar el PIN se cierran las demás sesiones abiertas de ese usuario
  const sid = /(?:^|;\s*)sid=([a-f0-9]{48})/.exec(req.headers.cookie || '')?.[1] || '';
  db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token != ?').run(id, sid);
  return { ok: true };
});

// ---------- estáticos ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

async function estatico(res, root, rel, req) {
  let dec;
  try { dec = decodeURIComponent(rel); } catch { return false; }
  if (dec.includes('\0')) return false;
  const file = normalize(join(root, dec));
  if (!file.startsWith(root)) return false;              // evita salir de la carpeta (../)
  let f = file;
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { return false; }
  if (f.includes('_poster')) return false;
  const tipo = MIME[extname(f)] || 'application/octet-stream';
  const cache = /\.(glb|webp|ttf|svg|mp4|webm|jpg)$/.test(f) ? 'public, max-age=86400' : 'no-cache';
  // videos: se mandan por partes (Range). Safari en iPhone no reproduce un video si el servidor no lo permite.
  if (/^video\//.test(tipo)) {
    let tam;
    try { tam = (await stat(f)).size; } catch { return false; }
    const m = /^bytes=(\d*)-(\d*)$/.exec(req?.headers.range || '');
    let ini = 0, fin = tam - 1;
    if (m) {
      if (m[1] === '') { ini = Math.max(0, tam - Number(m[2])); }        // bytes=-N: los últimos N
      else { ini = Number(m[1]); if (m[2] !== '') fin = Math.min(Number(m[2]), tam - 1); }
      if (ini > fin || ini >= tam) { res.writeHead(416, { 'Content-Range': `bytes */${tam}` }); res.end(); return true; }
    }
    res.writeHead(m ? 206 : 200, { 'Content-Type': tipo, 'Cache-Control': cache, 'Accept-Ranges': 'bytes',
      'Content-Length': fin - ini + 1, ...(m ? { 'Content-Range': `bytes ${ini}-${fin}/${tam}` } : {}) });
    if (req?.method === 'HEAD') { res.end(); return true; }
    createReadStream(f, { start: ini, end: fin }).on('error', () => res.destroy()).pipe(res);
    return true;
  }
  try {
    const data = await readFile(f);
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': cache });
    res.end(data);
    return true;
  } catch { return false; }
}

// ---------- servidor ----------
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'");
  if (TRAS_PROXY && req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  try {
    if (url.pathname.startsWith('/api/')) {
      // las escrituras deben venir del mismo origen (protección CSRF)
      if (req.method !== 'GET') {
        let origen = null;
        try { origen = req.headers.origin ? new URL(req.headers.origin).host : null; } catch { fail(403, 'Origen no permitido'); }
        if (origen && origen !== req.headers.host) fail(403, 'Origen no permitido');
        if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origen no permitido');
      }
      const r = rutas.find(r => r.m === req.method && r.re.test(url.pathname)) || fail(404, 'No encontrado');
      let body = null;
      if (req.method !== 'GET') {
        let raw = '';
        for await (const c of req) { raw += c; if (raw.length > 100_000) fail(413, 'Solicitud muy grande'); }
        try { body = raw ? JSON.parse(raw) : {}; } catch { fail(400, 'JSON inválido'); }
      }
      const out = r.fn({ req, res, body, q: url.searchParams, p: url.pathname.match(r.re), u: usuarioDe(req) });
      if (out?.__archivo) {   // descarga de archivo (respaldo)
        const data = await readFile(out.__archivo); await unlink(out.__archivo).catch(() => {});
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${out.nombre}"`, 'Cache-Control': 'no-store' });
        return res.end(data);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private' });
      return res.end(JSON.stringify(out));
    }
    if (url.pathname === '/caja' || url.pathname === '/comanda' || url.pathname === '/comanda/') { res.writeHead(301, { Location: '/caja/' }); return res.end(); }
    if (url.pathname === '/tarjeta' || url.pathname === '/tarjeta/') { res.writeHead(301, { Location: '/tarjeta.html' + url.search }); return res.end(); }
    if (url.pathname.startsWith('/caja/') && await estatico(res, ROOT_APP, url.pathname.slice(6), req)) return;
    if (!url.pathname.startsWith('/caja/') && await estatico(res, ROOT_MENU, url.pathname.slice(1), req)) return;
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: status === 500 ? 'Error interno' : e.message }));
  }
});
// conexiones lentas a propósito (slowloris) no pueden dejar al servidor sin cupo
servidor.headersTimeout = 15_000;
servidor.requestTimeout = 30_000;
// apagado ordenado: termina lo que está en curso y cierra la base sin perder lo último escrito
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  servidor.close(() => { cerrarBase(); process.exit(0); });
  setTimeout(() => { cerrarBase(); process.exit(0); }, 5000).unref();
});
servidor.listen(PORT, () => {
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
