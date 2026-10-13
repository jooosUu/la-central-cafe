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
  return async (method, path, body) => {
    const r = await fetch(BASE + '/api' + path, { method, headers: { 'Content-Type': 'application/json', cookie, origin: BASE }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: r.status, data: await r.json() };
  };
}
let ok = 0;
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
  assert.equal((await anon('GET', '/carta')).data.find(p => p.id === 'te-hatsu').agotado, true);
  await admin('POST', `/insumos/${id}/movimientos`, { tipo: 'ajuste', conteo: antes });
  assert.equal((await anon('GET', '/carta')).data.find(p => p.id === 'te-hatsu').agotado, false);
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
