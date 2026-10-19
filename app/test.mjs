// Prueba de punta a punta de la API contra un servidor corriendo (node test.mjs [url]).
// Usa los PIN de data/usuarios-iniciales.json. Córrelo contra una base temporal:
//   LACENTRAL_DB=/tmp/prueba.db PORT=3999 node server.mjs  y luego  node test.mjs http://localhost:3999
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://localhost:3000';
const { usuarios } = JSON.parse(readFileSync(new URL('./data/usuarios-iniciales.json', import.meta.url), 'utf8'));
const pin = u => usuarios.find(x => x.usuario === u).pin;

function cliente() {
  let cookie = '';
  const f = async (method, path, body) => {
    const r = await fetch(BASE + '/api' + path, { method, headers: { 'Content-Type': 'application/json', cookie, origin: BASE }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : null };
  };
  f.cookie = () => cookie;
  return f;
}
let ok = 0;
const itemsCarta = d => d.secciones.flatMap(s => s.bloques.flatMap(b => b.items));
const t = async (nombre, fn) => { await fn(); ok++; console.log('  ✓', nombre); };

const anon = cliente(), admin = cliente(), caja = cliente();

await t('sin sesión no deja ver datos', async () => assert.equal((await anon('GET', '/datos')).status, 401));
await t('PIN incorrecto es rechazado', async () => assert.equal((await anon('POST', '/login', { usuario: 'caja1', pin: '0000x' })).status, 401));
await t('login dueño y cajero', async () => {
  assert.equal((await admin('POST', '/login', { usuario: 'dueno', pin: pin('dueno') })).data.rol, 'admin');
  assert.equal((await caja('POST', '/login', { usuario: 'caja1', pin: pin('caja1') })).data.rol, 'cajero');
});

const stock = async n => (await admin('GET', '/datos')).data.insumos.find(i => i.nombre === n).stock;
const s0 = { pan: await stock('Pan baguette de ajo'), chorizo: await stock('Chorizo artesanal'), papa: await stock('Papa criolla'), coca: await stock('Coca-Cola Zero 250ml'), aguila: await stock('Aguila') };
let ventaId;

await t('venta: 1 chori-doble combo + 2 Aguila, precio calculado en el servidor', async () => {
  const r = await caja('POST', '/ventas', { items: [{ producto_id: 'chori-doble', variante: 'combo', cantidad: 1 }, { producto_id: 'aguila', cantidad: 2 }], pago: 'efectivo', recibido: 50000 });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.total, 24000 + 2 * 3500);
  assert.equal(r.data.cambio, 50000 - 31000);
  ventaId = r.data.id;
});
await t('inventario descontado por receta (pan 1, chorizo 2, papa 1, coca zero 1, aguila 2)', async () => {
  assert.equal(await stock('Pan baguette de ajo'), s0.pan - 1);
  assert.equal(await stock('Chorizo artesanal'), s0.chorizo - 2);
  assert.equal(await stock('Papa criolla'), s0.papa - 1);
  assert.equal(await stock('Coca-Cola Zero 250ml'), s0.coca - 1);
  assert.equal(await stock('Aguila'), s0.aguila - 2);
});
await t('datos inválidos son rechazados', async () => {
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'aguila', cantidad: -3 }], pago: 'efectivo' })).status, 400);
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'aguila', variante: 'combo', cantidad: 1 }], pago: 'efectivo' })).status, 400);
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'no-existe', cantidad: 1 }], pago: 'efectivo' })).status, 400);
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'aguila', cantidad: 1 }], pago: 'bitcoin' })).status, 400);
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'aguila', cantidad: 1 }], pago: 'efectivo', recibido: 100 })).status, 400);
});
await t('cajero NO puede anular ni cambiar precios', async () => {
  assert.equal((await caja('POST', `/ventas/${ventaId}/anular`)).status, 403);
  assert.equal((await caja('PUT', '/productos/choripan', { precio: 1 })).status, 403);
});
await t('dueño anula y el inventario vuelve', async () => {
  assert.equal((await admin('POST', `/ventas/${ventaId}/anular`)).status, 200);
  assert.equal(await stock('Chorizo artesanal'), s0.chorizo);
  assert.equal(await stock('Aguila'), s0.aguila);
  assert.equal((await admin('POST', `/ventas/${ventaId}/anular`)).status, 400);
});
await t('compra suma stock y conteo ajusta al valor real', async () => {
  const id = (await admin('GET', '/datos')).data.insumos.find(i => i.nombre === 'Queso').id;
  const antes = await stock('Queso');
  await caja('POST', `/insumos/${id}/movimientos`, { tipo: 'compra', cantidad: 10, costo_total: 9000 });
  assert.equal(await stock('Queso'), antes + 10);
  await caja('POST', `/insumos/${id}/movimientos`, { tipo: 'ajuste', conteo: 7 });
  assert.equal(await stock('Queso'), 7);
});
await t('reporte del día cuenta ventas no anuladas', async () => {
  const r = await caja('POST', '/ventas', { items: [{ producto_id: 'choripan', cantidad: 2 }], pago: 'nequi' });
  const rep = (await admin('GET', '/reportes')).data;
  assert.ok(rep.total >= 26000 && rep.anuladas >= 1);
  await admin('POST', `/ventas/${r.data.id}/anular`);
});
await t('carta pública marca agotado cuando falta un insumo', async () => {
  const id = (await admin('GET', '/datos')).data.insumos.find(i => i.nombre === 'Te HATSU').id;
  const antes = await stock('Te HATSU');
  await admin('POST', `/insumos/${id}/movimientos`, { tipo: 'ajuste', conteo: 0 });
  assert.equal(itemsCarta((await anon('GET', '/carta')).data).find(p => p.id === 'te-hatsu').agotado, true);
  await admin('POST', `/insumos/${id}/movimientos`, { tipo: 'ajuste', conteo: antes });
  assert.equal(itemsCarta((await anon('GET', '/carta')).data).find(p => p.id === 'te-hatsu').agotado, false);
});
await t('carta trae secciones del menú con combo y modelo 3D', async () => {
  const d = (await anon('GET', '/carta')).data;
  assert.deepEqual(d.secciones.map(s => s.titulo), ['choripan', 'bebidas']);
  const chori = itemsCarta(d).find(p => p.id === 'choripan');
  assert.equal(chori.model, 'choripan');
  assert.deepEqual(chori.comboIncluye, ['+papa criolla', '+coca-cola zero 250ml']);
});
await t('dueño crea categoría y producto; aparece en la carta; cajero no puede', async () => {
  assert.equal((await caja('POST', '/productos', { nombre: 'X', categoria: 'choripan', precio: 1 })).status, 403);
  assert.equal((await admin('POST', '/categorias', { nombre: 'Cafés', seccion: 'cafés', tipo: 'lista' })).status, 200);
  const r = await admin('POST', '/productos', { nombre: 'Tinto <b>grande</b>', categoria: 'cafés', precio: 3000, descripcion: 'de la casa' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.id, 'tinto-b-grande-b');
  const it = itemsCarta((await anon('GET', '/carta')).data).find(p => p.id === r.data.id);
  assert.equal(it.precio, 3000); assert.equal(it.model, null);
  assert.equal((await admin('POST', '/productos', { nombre: 'Y', categoria: 'no-existe', precio: 1 })).status, 400);
  assert.equal((await admin('PUT', `/productos/${r.data.id}`, { modelo: '../server' })).status, 400);
  await admin('PUT', `/productos/${r.data.id}`, { activo: false });
  assert.equal(itemsCarta((await anon('GET', '/carta')).data).some(p => p.id === r.data.id), false);
});
await t('QR por mesa (solo dueño) y validación de dirección', async () => {
  assert.equal((await caja('GET', '/qr?url=https://x.co/&mesas=2')).status, 403);
  const q = await admin('GET', '/qr?url=' + encodeURIComponent('https://menu.ejemplo.co/') + '&mesas=3');
  assert.equal(q.data.length, 3); assert.equal(q.data[2].url, 'https://menu.ejemplo.co/?mesa=3'); assert.ok(q.data[0].svg.startsWith('<svg'));
  assert.equal((await admin('GET', '/qr?url=javascript:alert(1)&mesas=2')).status, 400);
  assert.equal((await admin('GET', '/qr?url=https://x.co/&mesas=500')).status, 400);
});
await t('copia de seguridad descargable solo por el dueño', async () => {
  assert.equal((await caja('GET', '/respaldo')).status, 403);
  const r = await fetch(BASE + '/api/respaldo', { headers: { cookie: admin.cookie() } });
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(r.status, 200); assert.equal(buf.subarray(0, 15).toString(), 'SQLite format 3');
});
await t('petición desde otro origen es bloqueada', async () => {
  const r = await fetch(BASE + '/api/logout', { method: 'POST', headers: { origin: 'https://malicioso.example' } });
  assert.equal(r.status, 403);
});
await t('no se puede leer fuera de las carpetas públicas', async () => {
  const r = await fetch(BASE + '/caja/..%2F..%2Fapp%2Fdata%2Flacentral.db');
  assert.notEqual(r.status, 200);
});
console.log(`\n${ok} pruebas OK`);
