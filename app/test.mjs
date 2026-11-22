// Prueba de punta a punta de la API.  node test.mjs
// Sin argumentos levanta SU PROPIO servidor con una base temporal (puerto 3999) y la borra al terminar:
// nunca toca data/lacentral.db. Para probar otro servidor ya corriendo: node test.mjs http://host:puerto
// Usa los PIN de data/usuarios-iniciales.json.
import { readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

let BASE = process.argv[2];
let cerrar = async () => {};
if (!BASE) {
  const dbTmp = join(tmpdir(), `lacentral-prueba-${process.pid}.db`);
  const srv = spawn(process.execPath, [new URL('./server.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
    { env: { ...process.env, LACENTRAL_DB: dbTmp, PORT: '3999' }, stdio: 'ignore' });
  // en Windows el archivo queda bloqueado hasta que el servidor termina: esperar y reintentar el borrado
  cerrar = async () => {
    if (srv.exitCode === null && srv.signalCode === null) { srv.kill(); await once(srv, 'exit'); }
    for (let i = 0; i < 30; i++) {
      try { for (const s of ['', '-wal', '-shm']) rmSync(dbTmp + s, { force: true }); return; }
      catch { await new Promise(r => setTimeout(r, 100)); }
    }
  };
  const fallo = async e => { console.error(e); await cerrar(); process.exit(1); };
  process.on('uncaughtException', fallo);
  process.on('unhandledRejection', fallo);
  BASE = 'http://localhost:3999';
  for (let i = 0; ; i++) {
    try { await fetch(BASE + '/api/carta'); break; } catch { if (i > 50) throw new Error('El servidor de prueba no arrancó'); await new Promise(r => setTimeout(r, 100)); }
  }
}
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
  assert.deepEqual(d.secciones.map(s => s.titulo), ['café de día', 'choripan', 'fuego de noche', 'bebidas']);
  // horario de cada bloque: lo de la parrilla solo de noche, café y horneados solo de día, bebidas siempre
  const hor = Object.fromEntries(d.secciones.flatMap(s => s.bloques).map(b => [b.id, b.horario]));
  assert.equal(hor.choripan, 'noche'); assert.equal(hor.parrilla, 'noche');
  assert.equal(hor.cafes, 'dia'); assert.equal(hor.horneados, 'dia'); assert.equal(hor.cervezas, 'siempre');
  const chori = itemsCarta(d).find(p => p.id === 'choripan');
  assert.equal(chori.model, 'choripan');
  assert.deepEqual(chori.comboIncluye, ['+papa criolla', '+coca-cola zero 250ml']);
});
await t('dueño crea categoría y producto; aparece en la carta; cajero no puede', async () => {
  assert.equal((await caja('POST', '/productos', { nombre: 'X', categoria: 'choripan', precio: 1 })).status, 403);
  assert.equal((await admin('POST', '/categorias', { nombre: 'Postres', seccion: 'postres', tipo: 'lista' })).status, 200);
  const r = await admin('POST', '/productos', { nombre: 'Tinto <b>grande</b>', categoria: 'postres', precio: 3000, descripcion: 'de la casa' });
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
await t('comandas requieren sesión; crear, editar ítems y cobrar con propina y mesa', async () => {
  assert.equal((await anon('GET', '/comandas')).status, 401);
  assert.equal((await anon('POST', '/comandas', { mesa: 'Mesa 2', items: [{ producto_id: 'choripan', cantidad: 1 }] })).status, 401);
  assert.equal((await anon('PUT', '/comandas/1', { estado: 'cobrado' })).status, 401);
  assert.equal((await anon('DELETE', '/comandas/1')).status, 401);

  const c1 = await caja('POST', '/comandas', { mesa: 'Mesa 3', items: [{ producto_id: 'choripan', cantidad: 1 }] });
  assert.equal(c1.status, 200);
  assert.equal(c1.data.total, 13000);

  const c2 = await caja('PUT', `/comandas/${c1.data.id}`, {
    mesa: 'Mesa 4',
    items: [{ producto_id: 'choripan', variante: 'combo', cantidad: 1 }, { producto_id: 'aguila', cantidad: 1 }],
  });
  assert.equal(c2.status, 200);
  assert.equal(c2.data.mesa, 'Mesa 4');
  assert.equal(c2.data.total, 17000 + 3500);
  assert.equal(c2.data.items.length, 2);

  assert.equal((await caja('POST', '/ventas', {
    items: [{ producto_id: 'choripan', variante: 'combo', cantidad: 1 }, { producto_id: 'aguila', cantidad: 1 }],
    pago: 'efectivo', recibido: 21000, propina: 2000, mesa: 'Mesa 4', comanda_id: c1.data.id,
  })).status, 400);

  const v = await caja('POST', '/ventas', {
    items: [{ producto_id: 'choripan', variante: 'combo', cantidad: 1 }, { producto_id: 'aguila', cantidad: 1 }],
    pago: 'efectivo', recibido: 25000, propina: 2000, mesa: 'Mesa 4', comanda_id: c1.data.id,
  });
  assert.equal(v.status, 200);
  assert.equal(v.data.total, 22500);
  assert.equal(v.data.propina, 2000);
  assert.equal(v.data.cambio, 2500);
  const repTip = (await admin('GET', '/reportes')).data;
  assert.ok(repTip.propinas >= 2000);
  const activas = (await caja('GET', '/comandas')).data;
  assert.equal(activas.find(x => x.id === c1.data.id).estado, 'cobrado');
  await admin('POST', `/ventas/${v.data.id}/anular`);
});
await t('tarjeta de sellos: 1 sello por compra, premio a los 8 y anular devuelve', async () => {
  // el cliente saca la tarjeta (sin sesión); con el mismo celular recupera la misma
  assert.equal((await anon('POST', '/tarjeta', { nombre: 'Laura', telefono: '12' })).status, 400);
  const tj = await anon('POST', '/tarjeta', { nombre: 'Laura Gómez', telefono: '+57 310 555 4521' });
  assert.equal(tj.status, 200);
  assert.equal(tj.data.nombre, 'Laura'); assert.equal(tj.data.sellos, 0); assert.equal(tj.data.meta, 8);
  assert.equal(tj.data.telefono, '310 *** 4521');
  assert.equal((await anon('POST', '/tarjeta', { nombre: 'Otra', telefono: '3105554521' })).data.token, tj.data.token);
  assert.equal((await anon('GET', '/tarjeta/' + tj.data.token)).data.sellos, 0);
  // la caja la busca por celular (requiere sesión)
  assert.equal((await anon('GET', '/clientes?q=3105554521')).status, 401);
  assert.equal((await caja('GET', '/clientes?q=3105554521')).data.token, tj.data.token);
  assert.equal((await caja('GET', '/clientes?q=3000000000')).status, 404);
  const vender = extra => caja('POST', '/ventas', { items: [{ producto_id: 'aguila', cantidad: 1 }], pago: 'nequi', cliente: '3105554521', ...extra });
  // sin tarjeta completa no hay premio
  assert.equal((await vender({ premio: 'descuento' })).status, 400);
  const ventas = [];
  for (let i = 0; i < 8; i++) { const v = await vender(); assert.equal(v.status, 200); ventas.push(v.data); }
  assert.equal(ventas[7].tarjeta.sellos, 8);
  assert.equal((await anon('GET', '/tarjeta/' + tj.data.token)).data.premio, true);
  // café gratis: necesita un café en la cuenta
  assert.equal((await vender({ premio: 'cafe' })).status, 400);
  await admin('PUT', '/productos/cafe', { precio: 4000 });
  const vc = await caja('POST', '/ventas', { items: [{ producto_id: 'cafe', cantidad: 2 }, { producto_id: 'aguila', cantidad: 1 }], pago: 'efectivo', cliente: tj.data.token, premio: 'cafe' });
  assert.equal(vc.status, 200);
  assert.equal(vc.data.descuento, 4000); assert.equal(vc.data.total, vc.data.subtotal - 4000);
  assert.equal(vc.data.tarjeta.sellos, 1);   // 8 - 8 del canje + 1 de esta compra
  // anular la venta del canje devuelve el premio
  await admin('POST', `/ventas/${vc.data.id}/anular`);
  assert.equal((await caja('GET', '/clientes?q=3105554521')).data.sellos, 8);
  // descuento del 10%
  const vd = await vender({ premio: 'descuento' });
  assert.equal(vd.data.descuento, Math.round(vd.data.subtotal * 0.1));
  assert.equal(vd.data.tarjeta.sellos, 1);
  for (const v of [...ventas, vd.data]) await admin('POST', `/ventas/${v.id}/anular`);
  assert.equal((await caja('GET', '/clientes?q=3105554521')).data.sellos, 0);
  // venta con cliente inexistente: error, no se cobra a ciegas
  assert.equal((await caja('POST', '/ventas', { items: [{ producto_id: 'aguila', cantidad: 1 }], pago: 'nequi', cliente: '3000000000' })).status, 400);
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
await cerrar();   // apaga el servidor de prueba y borra su base temporal
process.exit(0);
