// QR por mesa. Uso: node qr.mjs https://tu-dominio/menu 12   -> ../menu/qr/mesa-1.svg … mesa-12.svg
import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';

const [base, n = '10'] = process.argv.slice(2);
if (!base?.startsWith('https://')) { console.error('Falta la URL pública (https://…). La RA solo funciona con https.'); process.exit(1); }
const out = new URL('../menu/qr/', import.meta.url);
mkdirSync(out, { recursive: true });
for (let i = 1; i <= Number(n); i++) {
  const url = `${base.replace(/\/$/, '')}/?mesa=${i}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#14110F', light: '#F3ECE2' } });
  writeFileSync(new URL(`mesa-${i}.svg`, out), svg);
  console.log('ok', url);
}
