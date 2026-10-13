// Capturas responsive del menú y la caja: node responsive.mjs -> ../assets/_r_*.png
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const pin = JSON.parse(readFileSync(new URL('../app/data/usuarios-iniciales.json', import.meta.url))).usuarios.find(u => u.usuario === 'dueno').pin;
const SIZES = [[320, 640, true], [390, 844, true], [768, 1024, true], [1024, 768, false], [1440, 900, false]];
const b = await chromium.launch({ channel: 'msedge' });
const problemas = [];
for (const [w, h, mob] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob && w < 700, hasTouch: mob });
  const p = await ctx.newPage();
  p.on('pageerror', e => problemas.push(`${w} JS: ${e.message}`));
  // MENÚ
  await p.goto('http://localhost:3000/?mesa=4'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) problemas.push(`menú ${w}px: desborde horizontal de ${ov}px`);
  await p.screenshot({ path: `../assets/_r_menu_${w}.png`, fullPage: true });
  await p.click('.foto[data-id=choripan]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `../assets/_r_visor_${w}.png` });
  // CAJA
  await p.goto('http://localhost:3000/caja/'); await p.waitForTimeout(700);
  await p.fill('#pin', pin); await p.click('#pin-form [type=submit]'); await p.waitForTimeout(900);
  await p.click('[data-add=choripan][data-var=combo]'); await p.click('[data-add=chori-doble][data-var=base]');
  await p.waitForTimeout(300);
  for (const v of ['vender', 'reportes', 'ajustes']) {
    if (v !== 'vender') { await p.goto('http://localhost:3000/caja/#' + v); await p.waitForTimeout(900); }
    const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (o > 0) problemas.push(`caja ${v} ${w}px: desborde horizontal de ${o}px`);
    await p.screenshot({ path: `../assets/_r_caja_${v}_${w}.png` });
  }
  await ctx.close();
}
await b.close();
console.log(problemas.length ? problemas.join('\n') : 'sin desbordes ni errores JS');
