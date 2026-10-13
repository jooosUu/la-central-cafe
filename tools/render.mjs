// Renderiza motion/index.html cuadro a cuadro y lo codifica con ffmpeg.
// Uso: node render.mjs <fmt> <theme> <salida> [fps] [--stills t1,t2,...]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const [fmt = 'square', theme = 'cream', out = 'out.mp4', fpsArg = '60'] = process.argv.slice(2);
const stillsIdx = process.argv.indexOf('--stills');
const stills = stillsIdx > 0 ? process.argv[stillsIdx + 1].split(',').map(Number) : null;
const fps = Number(fpsArg);
const size = { square: [1080, 1080], story: [1080, 1920], wide: [1920, 1080] }[fmt];

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:8765/index.html?frame=1&fmt=${fmt}&theme=${theme}`);
await page.waitForFunction(() => window.__ready === true);
const dur = await page.evaluate(() => window.DUR);
const alpha = theme === 'transparent';
const shot = () => page.screenshot({ type: 'png', omitBackground: alpha, clip: { x: 0, y: 0, width: size[0], height: size[1] } });

if (stills) {
  for (const t of stills) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: `${out}_${t}.png`, omitBackground: alpha });
  }
  await browser.close();
  process.exit(0);
}

const args = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
if (out.endsWith('.webm')) args.push('-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '28', '-auto-alt-ref', '0');
else if (out.endsWith('.mov')) args.push('-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le');
else if (out.endsWith('.gif')) args.push('-vf', 'scale=540:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse');
else args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart');
args.push(out);
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });

const frames = Math.round(dur * fps);
for (let i = 0; i < frames; i++) {
  await page.evaluate(t => window.render(t), i / fps);
  const buf = await shot();
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('listo:', out, frames, 'frames');
