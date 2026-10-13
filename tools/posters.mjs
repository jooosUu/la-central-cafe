// Genera menu/img/posters/<modelo>.webp a partir de los .glb (requiere el servidor "menu" en :8766)
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = new URL('../menu/', import.meta.url);
mkdirSync(new URL('img/posters/', dir), { recursive: true });
const models = readdirSync(new URL('models/', dir)).filter(f => f.endsWith('.glb')).map(f => f.slice(0, -4));
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
await page.goto('http://localhost:8766/_poster.html');
await page.waitForFunction(() => customElements.get('model-viewer'));
for (const m of models) {
  await page.evaluate(async src => {
    const mv = document.getElementById('mv');
    const done = new Promise(r => mv.addEventListener('load', r, { once: true }));
    mv.src = src; await done;
    await new Promise(r => setTimeout(r, 400));
  }, `models/${m}.glb`);
  const png = new URL(`img/posters/${m}.png`, dir);
  await page.locator('#mv').screenshot({ path: png.pathname.slice(1), omitBackground: true });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png.pathname.slice(1), '-vf', 'scale=360:-1', '-c:v', 'libwebp', '-quality', '85', png.pathname.slice(1).replace('.png', '.webp')]);
  console.log('ok', m);
}
await browser.close();
