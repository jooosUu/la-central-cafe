// Base de datos SQLite (node:sqlite, sin dependencias) + datos iniciales.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Carpeta de datos: app/data en el computador; en el servidor, el disco persistente (LACENTRAL_DATA=/var/data)
const DATA = process.env.LACENTRAL_DATA
  ? pathToFileURL(process.env.LACENTRAL_DATA.replace(/[\\/]*$/, '/'))
  : new URL('./data/', import.meta.url);
mkdirSync(DATA, { recursive: true });
export const db = new DatabaseSync(process.env.LACENTRAL_DB || fileURLToPath(new URL('lacentral.db', DATA)));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

// cierre ordenado (Render manda SIGTERM al publicar): se vuelca el WAL al archivo principal y se cierra la base
let cerrada = false;
export function cerrarBase() {
  if (cerrada) return;
  cerrada = true;
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch {}
}

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY, usuario TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin','cajero')), pin_hash TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS insumos (
  id INTEGER PRIMARY KEY, nombre TEXT UNIQUE NOT NULL, unidad TEXT NOT NULL,
  stock REAL NOT NULL DEFAULT 0, minimo REAL NOT NULL DEFAULT 0, costo REAL NOT NULL DEFAULT 0, activo INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, categoria TEXT NOT NULL,
  precio INTEGER NOT NULL, precio_combo INTEGER, activo INTEGER NOT NULL DEFAULT 1, orden INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS recetas (
  producto_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id),
  variante TEXT NOT NULL CHECK (variante IN ('base','combo')), cantidad REAL NOT NULL,
  PRIMARY KEY (producto_id, insumo_id, variante));
CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  total INTEGER NOT NULL, pago TEXT NOT NULL, recibido INTEGER, anulada INTEGER NOT NULL DEFAULT 0, nota TEXT);
CREATE TABLE IF NOT EXISTS venta_items (
  id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL REFERENCES ventas(id), producto_id TEXT NOT NULL,
  nombre TEXT NOT NULL, variante TEXT NOT NULL, cantidad INTEGER NOT NULL, precio INTEGER NOT NULL, costo REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, insumo_id INTEGER NOT NULL REFERENCES insumos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('venta','compra','ajuste','merma','anulacion')),
  cantidad REAL NOT NULL, costo REAL, venta_id INTEGER, usuario_id INTEGER, nota TEXT);
CREATE TABLE IF NOT EXISTS comandas (
  id INTEGER PRIMARY KEY,
  mesa TEXT NOT NULL,
  cliente TEXT,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  total INTEGER NOT NULL DEFAULT 0,
  notas TEXT
);
CREATE TABLE IF NOT EXISTS comanda_items (
  id INTEGER PRIMARY KEY,
  comanda_id INTEGER NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
  producto_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  variante TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio INTEGER NOT NULL,
  notas TEXT
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  fecha TEXT NOT NULL,
  estrellas INTEGER NOT NULL,
  comentario TEXT,
  mesa TEXT,
  cliente TEXT
);
CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  exp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS ix_mov_insumo ON movimientos(insumo_id, fecha);
CREATE INDEX IF NOT EXISTS ix_comandas_estado ON comandas(estado);
CREATE INDEX IF NOT EXISTS ix_feedback_fecha ON feedback(fecha);
CREATE INDEX IF NOT EXISTS ix_sesiones_exp ON sesiones(exp);
`);

// ---------- PIN ----------
export function hashPin(pin) {
  const salt = randomBytes(16);
  return salt.toString('hex') + ':' + scryptSync(String(pin), salt, 32).toString('hex');
}
export function checkPin(pin, stored) {
  const [s, h] = stored.split(':');
  const a = scryptSync(String(pin), Buffer.from(s, 'hex'), 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- datos iniciales (solo si la base está vacía) ----------
export function seed() {
  if (db.prepare('SELECT COUNT(*) n FROM productos').get().n > 0) return false;
  // Usuarios iniciales: del archivo local de prueba, o de variables de entorno en el servidor
  const file = new URL('usuarios-iniciales.json', DATA);
  let usuarios;
  if (existsSync(file)) usuarios = JSON.parse(readFileSync(file, 'utf8')).usuarios;
  else {
    const env = { dueno: process.env.PIN_DUENO, caja1: process.env.PIN_CAJA1, caja2: process.env.PIN_CAJA2 };
    for (const [k, v] of Object.entries(env)) if (!/^\d{4,8}$/.test(v || '')) throw new Error(`Falta la variable PIN_${k.toUpperCase()} (4 a 8 números) para crear los usuarios iniciales`);
    usuarios = [{ usuario: 'dueno', nombre: 'Dueño', rol: 'admin', pin: env.dueno },
      { usuario: 'caja1', nombre: 'Caja 1', rol: 'cajero', pin: env.caja1 }, { usuario: 'caja2', nombre: 'Caja 2', rol: 'cajero', pin: env.caja2 }];
  }

  db.exec('BEGIN');
  try {
    const iu = db.prepare('INSERT INTO usuarios (usuario, nombre, rol, pin_hash) VALUES (?,?,?,?)');
    for (const u of usuarios) iu.run(u.usuario, u.nombre, u.rol, hashPin(u.pin));

    // Insumos: [nombre, unidad, stock inicial, mínimo, costo unitario]  — VALORES DE PRUEBA
    const insumos = [
      ['Pan baguette de ajo', 'und', 40, 10, 1800], ['Chorizo artesanal', 'und', 60, 15, 3200],
      ['Chimichurri', 'porción', 50, 10, 400], ['Papa criolla', 'porción', 30, 8, 900],
      ['Aguacate', 'porción', 20, 5, 900], ['Queso', 'porción', 25, 5, 800],
      ['Coca-Cola Zero 250ml', 'und', 24, 6, 1500],
      ['Stella Artois', 'und', 24, 6, 3800], ['Solecita', 'und', 24, 6, 2600], ['Coronita', 'und', 24, 6, 2600],
      ['Aguila', 'und', 30, 6, 2000], ['Poker', 'und', 30, 6, 2000],
      ['Coca-Cola 250ml', 'und', 24, 6, 1500], ['Coca-Cola 400ml', 'und', 24, 6, 2400],
      ['Soda HATSU', 'und', 12, 4, 2700], ['Te HATSU', 'und', 12, 4, 4200], ['Agua 600ml', 'und', 24, 6, 1500],
    ];
    const ii = db.prepare('INSERT INTO insumos (nombre, unidad, stock, minimo, costo) VALUES (?,?,?,?,?)');
    const ins = {};
    for (const r of insumos) ins[r[0]] = Number(ii.run(...r).lastInsertRowid);

    // Productos (igual al menú) + recetas
    const ip = db.prepare('INSERT INTO productos (id, nombre, categoria, precio, precio_combo, orden) VALUES (?,?,?,?,?,?)');
    const ir = db.prepare('INSERT INTO recetas (producto_id, insumo_id, variante, cantidad) VALUES (?,?,?,?)');
    const combo = [['Papa criolla', 1], ['Coca-Cola Zero 250ml', 1]];
    const productos = [
      ['choripan', 'Choripan', 'choripan', 13000, 17000, [['Pan baguette de ajo', 1], ['Chorizo artesanal', 1], ['Chimichurri', 1]]],
      ['chori-doble', 'Chori-doble', 'choripan', 20000, 24000, [['Pan baguette de ajo', 1], ['Chorizo artesanal', 2], ['Chimichurri', 1]]],
      ['aguacate', 'Aguacate', 'adiciones', 2000, null, [['Aguacate', 1]]],
      ['queso', 'Queso', 'adiciones', 2000, null, [['Queso', 1]]],
      ['stella', 'Stella Artois', 'cervezas', 6000, null, [['Stella Artois', 1]]],
      ['solecita', 'Solecita', 'cervezas', 4500, null, [['Solecita', 1]]],
      ['coronita', 'Coronita', 'cervezas', 4500, null, [['Coronita', 1]]],
      ['aguila', 'Aguila', 'cervezas', 3500, null, [['Aguila', 1]]],
      ['poker', 'Poker', 'cervezas', 3500, null, [['Poker', 1]]],
      ['coca-250', 'Coca-Cola 250ml', 'sin alcohol', 2500, null, [['Coca-Cola 250ml', 1]]],
      ['coca-400', 'Coca-Cola 400ml', 'sin alcohol', 4000, null, [['Coca-Cola 400ml', 1]]],
      ['soda-hatsu', 'Soda HATSU', 'sin alcohol', 4500, null, [['Soda HATSU', 1]]],
      ['te-hatsu', 'Te HATSU', 'sin alcohol', 7000, null, [['Te HATSU', 1]]],
      ['agua', 'Agua 600ml', 'sin alcohol', 3000, null, [['Agua 600ml', 1]]],
    ];
    productos.forEach(([id, nombre, cat, precio, pc, receta], i) => {
      ip.run(id, nombre, cat, precio, pc, i);
      for (const [n, q] of receta) ir.run(id, ins[n], 'base', q);
      if (pc) for (const [n, q] of combo) ir.run(id, ins[n], 'combo', q);
    });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return true;
}

// ---------- migraciones (se aplican sobre bases existentes sin perder datos) ----------
// versión del esquema: cuando sube, antes de tocar la base se guarda una copia completa (respaldos/antes-migracion-…)
const ESQUEMA = 3;
export function migrar() {
  const v = db.prepare('PRAGMA user_version').get().user_version;
  const hayDatos = db.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type = 'table' AND name = 'ventas'`).get().n > 0;
  if (v < ESQUEMA && hayDatos && !process.env.LACENTRAL_DB) {
    const dir = new URL('respaldos/', DATA);
    mkdirSync(dir, { recursive: true });
    const destino = fileURLToPath(new URL(`antes-migracion-v${v}-${fechaBogota()}-${Date.now()}.db`, dir));
    db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
    console.log('  Copia antes de actualizar la base: ' + destino);
  }
  migrarEsquema();
  db.exec(`CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT)`);
  if (v < ESQUEMA) db.exec(`PRAGMA user_version = ${ESQUEMA}`);
}
export const ajuste = {
  get: k => db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get(k)?.valor ?? null,
  set: (k, val) => db.prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor').run(k, String(val)),
};
function migrarEsquema() {
  const cols = db.prepare('PRAGMA table_info(productos)').all().map(c => c.name);
  if (!cols.includes('descripcion')) db.exec('ALTER TABLE productos ADD COLUMN descripcion TEXT');
  if (!cols.includes('modelo')) db.exec('ALTER TABLE productos ADD COLUMN modelo TEXT');
  const vcols = db.prepare('PRAGMA table_info(ventas)').all().map(c => c.name);
  if (!vcols.includes('mesa')) db.exec('ALTER TABLE ventas ADD COLUMN mesa TEXT');
  if (!vcols.includes('propina')) db.exec('ALTER TABLE ventas ADD COLUMN propina INTEGER NOT NULL DEFAULT 0');
  db.exec(`CREATE TABLE IF NOT EXISTS sesiones (
    token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, exp INTEGER NOT NULL)`);
  db.exec('CREATE INDEX IF NOT EXISTS ix_sesiones_exp ON sesiones(exp)');
  db.exec(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, estrellas INTEGER NOT NULL,
    comentario TEXT, mesa TEXT, cliente TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, seccion TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('destacado','lista')), orden INTEGER NOT NULL DEFAULT 0)`);
  if (db.prepare('SELECT COUNT(*) n FROM categorias').get().n === 0) {
    const ic = db.prepare('INSERT INTO categorias (id, nombre, seccion, tipo, orden) VALUES (?,?,?,?,?)');
    [['choripan', 'Choripan', 'choripan', 'destacado'], ['adiciones', 'Adiciones', 'choripan', 'lista'],
     ['cervezas', 'Cervezas', 'bebidas', 'lista'], ['sin alcohol', 'Sin alcohol', 'bebidas', 'lista']]
      .forEach((c, i) => ic.run(...c, i));
    // descripciones y modelos 3D de los productos iniciales
    const desc = {
      choripan: 'Pan baguette de ajo, chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
      'chori-doble': 'Pan baguette de ajo, doble chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.',
    };
    for (const p of db.prepare('SELECT id FROM productos').all()) {
      db.prepare('UPDATE productos SET modelo = COALESCE(modelo, ?), descripcion = COALESCE(descripcion, ?) WHERE id = ?')
        .run(p.id, desc[p.id] ?? null, p.id);
    }
  }
  migrarHorarios();
  migrarFidelizacion();
  migrarCatalogo();
}

// ---------- tarjeta de sellos: 1 sello por compra, 8 sellos = premio (café gratis o descuento) ----------
// el saldo de un cliente es la suma de sus movimientos en 'sellos' (+1 por compra, -8 al canjear);
// así anular una venta solo es borrar sus movimientos.
function migrarFidelizacion() {
  db.exec(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY, telefono TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL, creado TEXT NOT NULL)`);
  db.exec(`CREATE TABLE IF NOT EXISTS sellos (
    id INTEGER PRIMARY KEY, cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    venta_id INTEGER REFERENCES ventas(id), fecha TEXT NOT NULL, cantidad INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('sello','canje')))`);
  db.exec('CREATE INDEX IF NOT EXISTS ix_sellos_cliente ON sellos(cliente_id)');
  const scols = db.prepare('PRAGMA table_info(sellos)').all().map(c => c.name);
  if (!scols.includes('icono')) db.exec(`ALTER TABLE sellos ADD COLUMN icono TEXT NOT NULL DEFAULT 'cafe'`);
  const vcols = db.prepare('PRAGMA table_info(ventas)').all().map(c => c.name);
  if (!vcols.includes('cliente_id')) db.exec('ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id)');
  if (!vcols.includes('descuento')) db.exec('ALTER TABLE ventas ADD COLUMN descuento INTEGER NOT NULL DEFAULT 0');
  if (!vcols.includes('premio')) db.exec('ALTER TABLE ventas ADD COLUMN premio TEXT');
}

// ---------- carta de día / carta de noche (tarjetas "café de día" y "fuego de noche") ----------
// horario de cada categoría: 'dia' = solo de día, 'noche' = solo en la parrilla (jue–sáb 4–10 pm), 'siempre' = ambas.
// En la parrilla se muestra TODO; de día se ocultan las de 'noche'.
// Los productos nuevos entran con precio 0 (= "precio por confirmar"): se editan desde la caja.
function migrarHorarios() {
  const ccols = db.prepare('PRAGMA table_info(categorias)').all().map(c => c.name);
  if (ccols.includes('horario')) return;               // ya migrado: no tocar lo que el dueño haya cambiado
  db.exec(`ALTER TABLE categorias ADD COLUMN horario TEXT NOT NULL DEFAULT 'siempre'`);
  db.prepare(`UPDATE categorias SET horario = 'noche' WHERE id IN ('choripan', 'adiciones')`).run();
  const ic = db.prepare('INSERT OR IGNORE INTO categorias (id, nombre, seccion, tipo, orden, horario) VALUES (?,?,?,?,?,?)');
  const ip = db.prepare('INSERT OR IGNORE INTO productos (id, nombre, categoria, precio, orden, descripcion) VALUES (?,?,?,?,?,?)');
  const tx = [
    // café de día: van primero en la carta
    ['cafes', 'Café', 'café de día', 'lista', -20, 'dia', [
      ['cafe', 'Café', 'Café de origen.'],
    ]],
    ['horneados', 'Horneados', 'café de día', 'lista', -19, 'dia', [
      ['empanadas-horneadas', 'Empanadas horneadas', ''],
      ['pastel-pollo', 'Pastel de pollo', ''],
      ['pastel-hawaiano', 'Pastel hawaiano', ''],
      ['torta-vino', 'Torta de vino', ''],
      ['mantecada', 'Mantecada', ''],
    ]],
    // fuego de noche: junto al choripán
    ['parrilla', 'De la parrilla', 'fuego de noche', 'lista', 1, 'noche', [
      ['alitas', 'Alitas', 'Lulo, maracuyá o BBQ.'],
      ['costillas-bbq', 'Costillas BBQ', ''],
      ['sandwich', 'Sándwich', ''],
      ['nachos', 'Nachos', ''],
    ]],
  ];
  db.exec('BEGIN');
  try {
    for (const [id, nombre, seccion, tipo, orden, horario, prods] of tx) {
      ic.run(id, nombre, seccion, tipo, orden, horario);
      prods.forEach(([pid, pn, pd], i) => ip.run(pid, pn, id, 0, i, pd || null));
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- catálogo y precios reales (nov 2026): se aplica una sola vez por BD ----------
function migrarCatalogo() {
  db.exec('CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT)');
  if (db.prepare(`SELECT valor FROM ajustes WHERE clave = 'catalogo_2026_11'`).get()) return;

  const nuevasCats = [
    ['ajies', 'Ajíes de la casa', 'de la casa', 'lista', 10, 'siempre'],
    ['paquetes', 'Paquetes', 'mecato y otros', 'lista', 20, 'siempre'],
    ['ponques', 'Ponqués y galletas', 'mecato y otros', 'lista', 21, 'siempre'],
    ['dulces', 'Dulces y chicles', 'mecato y otros', 'lista', 22, 'siempre'],
    ['otros', 'Otros', 'mecato y otros', 'lista', 23, 'siempre'],
  ];

  const actualizar = [
    ['coronita', 'Coronita', 4000, 1],
    ['stella', 'Stella Artois', 5000, 1],
    ['agua', 'Agua Cristal 600ml', 2500, 1],
    ['coca-250', 'Coca Mini 250 ml', 2500, 1],
    ['empanadas-horneadas', 'Empanadas', 3500, 1],
    ['pastel-pollo', 'Pastel de pollo', 3500, 1],
    ['pastel-hawaiano', 'Pastel hawaiano', 3500, 1],
    ['torta-vino', 'Torta de vino porción grande', 6000, 1],
    ['mantecada', 'Mantecada porción', 3000, 1],
    ['cafe', 'Café', 0, 0],
  ];

  const nuevosProds = [
    // Café y aromáticas (día)
    ['tinto-greca', 'Tinto greca', 'cafes', 1500, 1],
    ['perico', 'Perico', 'cafes', 2500, 2],
    ['cafe-leche', 'Café leche', 'cafes', 4000, 3],
    ['aromatica-sobre', 'Aromáticas sobre', 'cafes', 1500, 4],
    ['aromatica-frutas', 'Aromáticas con frutas', 'cafes', 3500, 5],
    ['expreso', 'Expreso (máquina)', 'cafes', 3000, 6],
    ['americano', 'Americano (máquina)', 'cafes', 4000, 7],
    ['capuchino', 'Capuchino (máquina)', 'cafes', 5000, 8],
    // Horneados (día)
    ['brazo-de-reina', 'Brazo de Reina', 'horneados', 3000, 6],
    // Cervezas (siempre)
    ['club-dorada', 'Club Dorada', 'cervezas', 4000, 15],
    // Sin alcohol / aguas / energizantes (siempre)
    ['coca-zero-250', 'Coca Mini Zero 250 ml', 'sin alcohol', 2500, 16],
    ['gaseosa-postobon-250', 'Gaseosa 250 ml Postobón', 'sin alcohol', 2000, 17],
    ['gaseosa-postobon-400', 'Gaseosa 400 ml Postobón', 'sin alcohol', 4000, 18],
    ['pony-mini-250', 'Pony Mini 250 ml', 'sin alcohol', 2500, 19],
    ['pony-malta-330', 'Pony Malta 330 ml', 'sin alcohol', 3500, 20],
    ['jugo-hit-500', 'Jugo Hit 500 ml', 'sin alcohol', 3500, 21],
    ['power', 'Power', 'sin alcohol', 3500, 22],
    ['gatorade-500', 'Gatorade 500 ml', 'sin alcohol', 4500, 23],
    ['gatorade-zero-500', 'Gatorade Zero 500 ml', 'sin alcohol', 4500, 24],
    ['speed-botella-250', 'Speed botella 250', 'sin alcohol', 2500, 25],
    ['speed-lata', 'Speed lata', 'sin alcohol', 3000, 26],
    ['vive-100', 'Vive 100', 'sin alcohol', 2500, 27],
    ['red-bull-lata', 'Red bull lata', 'sin alcohol', 8800, 28],
    ['agua-pequena-300', 'Agua pequeña 300 ml', 'sin alcohol', 1500, 29],
    ['agua-gas-600', 'Agua Cristal con gas 600 ml', 'sin alcohol', 2700, 30],
    ['agua-litro', 'Agua Cristal Litro', 'sin alcohol', 3000, 31],
    ['bretana', 'Bretaña', 'sin alcohol', 3500, 32],
    // Ajíes de la casa (tarros)
    ['aji-maracuya', 'Ají maracuyá (tarro)', 'ajies', 20000, 1],
    ['aji-lulo', 'Ají lulo (tarro)', 'ajies', 20000, 2],
    ['aji-chorizo', 'Ají chorizo (tarro)', 'ajies', 24000, 3],
    // Paquetes
    ['cheetos', 'Cheetos', 'paquetes', 3000, 1],
    ['detodito', 'Detodito', 'paquetes', 3000, 2],
    ['choklitos', 'Choklitos', 'paquetes', 2500, 3],
    ['tostacos-picantes', 'Tostacos picantes', 'paquetes', 2800, 4],
    ['papas-margarita', 'Papas Margarita', 'paquetes', 2500, 5],
    ['natuchips', 'Natuchips', 'paquetes', 2500, 6],
    ['doritos', 'Doritos', 'paquetes', 3000, 7],
    ['mani-moto-limon', 'Maní Moto Limón', 'paquetes', 2500, 8],
    ['mani-moto-natural', 'Maní Moto Natural', 'paquetes', 2500, 9],
    // Ponqués y galletas
    ['club-social', 'Club Social', 'ponques', 1200, 1],
    ['chokis', 'Chokis', 'ponques', 2000, 2],
    ['ponque-gala', 'Ponqué Gala', 'ponques', 2500, 3],
    ['chocorramo-tajada', 'Chocorramo tajada (grande)', 'ponques', 3200, 4],
    ['chocorramo-miti', 'Chocorramo miti (mediano)', 'ponques', 2500, 5],
    ['chocorramo-brownie', 'Chocorramo Brownie', 'ponques', 4000, 6],
    ['barrita-chocorramo', 'Barrita de chocorramo', 'ponques', 2500, 7],
    ['gansito', 'Gansito', 'ponques', 2500, 8],
    // Dulces y chicles
    ['halls-x1', 'Halls x1', 'dulces', 200, 1],
    ['halls-barra', 'Halls barra', 'dulces', 2400, 2],
    ['trident-x1', 'Trident x1', 'dulces', 300, 3],
    ['trident-x3', 'Trident x3', 'dulces', 1200, 4],
    ['trident-x5', 'Trident x5', 'dulces', 2200, 5],
    ['chiclets-x2', 'Chiclets x2', 'dulces', 300, 6],
    ['chocolatina-jet', 'Chocolatina JET', 'dulces', 1300, 7],
    ['bombombum', 'Bombombum', 'dulces', 700, 8],
    ['sparkies', 'Sparkies', 'dulces', 300, 9],
    ['milka-oreo', 'Milka Oreo', 'dulces', 2300, 10],
    // Otros
    ['cigarrillos', 'Cigarrillos', 'otros', 1300, 1],
  ];

  const ic = db.prepare('INSERT OR IGNORE INTO categorias (id, nombre, seccion, tipo, orden, horario) VALUES (?,?,?,?,?,?)');
  const up = db.prepare('UPDATE productos SET nombre = ?, precio = ?, activo = ? WHERE id = ?');
  const ip = db.prepare('INSERT OR IGNORE INTO productos (id, nombre, categoria, precio, orden) VALUES (?,?,?,?,?)');

  db.exec('BEGIN');
  try {
    for (const c of nuevasCats) ic.run(...c);
    for (const [id, nom, pre, act] of actualizar) up.run(nom, pre, act, id);
    for (const p of nuevosProds) ip.run(...p);
    db.prepare(`INSERT OR REPLACE INTO ajustes (clave, valor) VALUES ('catalogo_2026_11', '1')`).run();
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- copia de seguridad diaria automática (data/respaldos, se guardan 14) ----------
function fechaBogota(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function respaldoDiario() {
  if (process.env.LACENTRAL_DB) return null;           // no respaldar bases de prueba
  const dir = new URL('respaldos/', DATA);
  mkdirSync(dir, { recursive: true });
  const f = `lacentral-${fechaBogota()}.db`;
  const destino = fileURLToPath(new URL(f, dir));
  if (!existsSync(destino)) db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  const viejos = readdirSync(dir).filter(x => /^lacentral-\d{4}-\d{2}-\d{2}\.db$/.test(x)).sort().slice(0, -14);
  for (const v of viejos) unlinkSync(new URL(v, dir));
  return destino;
}
