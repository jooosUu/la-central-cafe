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
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

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
CREATE INDEX IF NOT EXISTS ix_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS ix_mov_insumo ON movimientos(insumo_id, fecha);
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
export function migrar() {
  const cols = db.prepare('PRAGMA table_info(productos)').all().map(c => c.name);
  if (!cols.includes('descripcion')) db.exec('ALTER TABLE productos ADD COLUMN descripcion TEXT');
  if (!cols.includes('modelo')) db.exec('ALTER TABLE productos ADD COLUMN modelo TEXT');
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
}

// ---------- copia de seguridad diaria automática (data/respaldos, se guardan 14) ----------
export function respaldoDiario() {
  if (process.env.LACENTRAL_DB) return null;           // no respaldar bases de prueba
  const dir = new URL('respaldos/', DATA);
  mkdirSync(dir, { recursive: true });
  const d = new Date(), f = `lacentral-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.db`;
  const destino = fileURLToPath(new URL(f, dir));
  if (!existsSync(destino)) db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
  const viejos = readdirSync(dir).filter(x => /^lacentral-\d{4}-\d{2}-\d{2}\.db$/.test(x)).sort().slice(0, -14);
  for (const v of viejos) unlinkSync(new URL(v, dir));
  return destino;
}
