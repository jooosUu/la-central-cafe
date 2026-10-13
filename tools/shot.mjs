// Captura de página completa en tamaño celular: node shot.mjs <url> <salida.png>
import { chromium } from 'playwright-core';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto(url); await p.waitForTimeout(1500);
await p.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; await i.decode().catch(() => {}); } });
await p.screenshot({ path: out, fullPage: true });
await b.close();
