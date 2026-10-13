// Capturas de la caja para revisión: node caja_shots.mjs  -> ../assets/_caja_*.png
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const { usuarios } = JSON.parse(readFileSync(new URL('../app/data/usuarios-iniciales.json', import.meta.url)));
const pin = usuarios.find(u => u.usuario === 'dueno').pin;
const b = await chromium.launch({ channel: 'msedge' });
for (const [tag, vp, mobile] of [['pc', { width: 1366, height: 820 }, false], ['cel', { width: 390, height: 844 }, true]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  p.on('pageerror', e => console.log('ERROR JS', tag, e.message));
  await p.goto('http://localhost:3000/caja/'); await p.waitForTimeout(700);
  await p.screenshot({ path: `../assets/_caja_${tag}_0login.png` });
  await p.fill('#pin', pin); await p.click('#pin-form [type=submit]'); await p.waitForTimeout(900);
  await p.click('[data-add=choripan][data-var=combo]'); await p.click('[data-add=chori-doble][data-var=base]');
  await p.click('[data-cat=cervezas]'); await p.waitForTimeout(150); await p.click('[data-add=aguila]'); await p.click('[data-add=aguila]');
  if (mobile) await p.click('#c-toggle');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `../assets/_caja_${tag}_1vender.png` });
  if (tag === 'pc') {   // registrar 1 venta para que los reportes tengan algo
    await p.click('[data-rec="50000"]'); await p.click('#cobrar'); await p.waitForTimeout(800);
    await p.screenshot({ path: `../assets/_caja_${tag}_2venta.png` });
    await p.click('#modal [type=submit]');
  }
  for (const v of ['inventario', 'reportes', 'ajustes']) {
    await p.goto('http://localhost:3000/caja/#' + v); await p.waitForTimeout(900);
    await p.screenshot({ path: `../assets/_caja_${tag}_${v}.png`, fullPage: !mobile });
  }
  await p.close();
}
await b.close();
