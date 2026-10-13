// Genera modelos 3D DE PRUEBA (low-poly, escala real en metros) para el menú AR.
// Uso: node models.mjs  -> ../menu/models/*.glb
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';

// GLTFExporter usa FileReader (no existe en Node)
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
};

const OUT = new URL('../menu/models/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// ---------- utilidades ----------
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mat = (color, roughness = 0.7, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const mesh = (geo, m, [x = 0, y = 0, z = 0] = [], name) => {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (name) o.name = name; return o;
};
const lathe = (pts, segs = 48, phiStart = 0, phiLength = Math.PI * 2) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs, phiStart, phiLength);
const smooth = (pts, n = 64) => new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n).map(v => [Math.max(0, v.x), v.y]);

async function save(name, root) {
  const scene = new THREE.Scene(); scene.add(root);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  writeFileSync(new URL(name + '.glb', OUT), Buffer.from(glb));
  console.log('ok', name, (glb.byteLength / 1024).toFixed(0) + ' KB');
}

// ---------- choripán ----------
function tabla(w, d) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, 0.016, d), mat('#9A6A43', 0.85), [0, 0.008, 0], 'tabla'));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.017, 24), mat('#7A5032', 0.85), [w / 2 - 0.03, 0.0085, 0]));
  return g;
}
function chorizo(len, r, z, y) {
  const g = new THREE.Group();
  const c = mesh(new THREE.CapsuleGeometry(r, len, 12, 32), mat('#9C3520', 0.45), [0, y, z], 'chorizo');
  c.rotation.z = Math.PI / 2; g.add(c);
  const marca = mat('#3A140C', 0.9);
  for (let i = -2; i <= 2; i++) {               // marcas de parrilla
    const t = mesh(new THREE.TorusGeometry(r * 1.005, r * 0.12, 6, 32, Math.PI), marca, [i * len / 5.5, y, z]);
    t.rotation.y = Math.PI / 2 + 0.35; t.rotation.z = 0; g.add(t);
  }
  const verde = mat('#4F7A2A', 0.8), rojo = mat('#B5402A', 0.8), ajo = mat('#EDE3C8', 0.8);
  for (let i = 0; i < 46; i++) {                // chimichurri
    const m = [verde, verde, verde, rojo, ajo][Math.floor(rnd() * 5)];
    const s = mesh(new THREE.SphereGeometry(0.0032 + rnd() * 0.0025, 8, 6), m,
      [(rnd() - 0.5) * len * 1.05, y + r * (0.75 + rnd() * 0.2), z + (rnd() - 0.5) * r * 1.3]);
    s.scale.y = 0.45; g.add(s);
  }
  return g;
}
function pan(len, w, h) {
  const g = new THREE.Group();
  const corteza = mat('#C98A47', 0.85), miga = mat('#EED9A8', 0.95, 0, { side: THREE.DoubleSide });
  // mitad inferior
  const inf = mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), corteza, [0, h, 0]);
  inf.scale.set(len / 2, h, w / 2); g.add(inf);
  const caraInf = mesh(new THREE.CircleGeometry(1, 48), miga, [0, h + 0.0005, 0]);
  caraInf.rotation.x = -Math.PI / 2; caraInf.scale.set(len / 2, w / 2, 1); g.add(caraInf);
  // mitad superior abierta (bisagra atrás)
  const sup = new THREE.Group();
  const cap = mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), corteza);
  cap.scale.set(len / 2, h * 1.15, w / 2); sup.add(cap);
  const caraSup = mesh(new THREE.CircleGeometry(1, 48), miga);
  caraSup.rotation.x = Math.PI / 2; caraSup.scale.set(len / 2, w / 2, 1); sup.add(caraSup);
  const hinge = new THREE.Group(); hinge.position.set(0, h, -w / 2);
  sup.position.set(0, 0, w / 2); hinge.add(sup); hinge.rotation.x = -1.15;
  g.add(hinge);
  return g;
}
function choripan(doble) {
  const g = new THREE.Group();
  const w = doble ? 0.11 : 0.075;
  g.add(tabla(0.32, 0.17));
  const p = pan(0.24, w, 0.03); p.position.y = 0.016; g.add(p);
  const zs = doble ? [-0.022, 0.022] : [0.006];
  zs.forEach(z => g.add(chorizo(0.19, 0.019, z, 0.016 + 0.03 + 0.012)));
  return g;
}

// ---------- botellas y latas ----------
function botella({ h, r, glass, opacity = 0.55, liquid, fill = 0.82, label, labelY = [0.18, 0.5], cap = '#C9A227', tipo = 'cerveza' }) {
  const prof = tipo === 'pet'
    ? smooth([[0, 0], [r * 0.9, 0.003], [r, 0.04], [r * 0.93, 0.25], [r, 0.42], [r, 0.62], [r * 0.6, 0.82], [r * 0.38, 0.9], [r * 0.38, 1]].map(([a, b]) => [a, b * h]))
    : tipo === 'contour'
      ? smooth([[0, 0], [r * 0.85, 0.004], [r, 0.05], [r * 0.82, 0.22], [r, 0.4], [r * 0.9, 0.55], [r * 0.6, 0.75], [r * 0.4, 0.9], [r * 0.42, 1]].map(([a, b]) => [a, b * h]))
      : smooth([[0, 0], [r * 0.9, 0.004], [r, 0.04], [r, 0.55], [r * 0.82, 0.66], [r * 0.42, 0.78], [r * 0.38, 0.95], [r * 0.42, 1]].map(([a, b]) => [a, b * h]));
  const g = new THREE.Group();
  g.add(mesh(lathe(prof), mat(glass, 0.08, 0, { transparent: true, opacity, side: THREE.DoubleSide }), [], 'vidrio'));
  const top = fill * h;
  const liq = prof.filter(([, y]) => y <= top).map(([a, y]) => [a * 0.94, y]);
  liq.push([0, top]);
  g.add(mesh(lathe(liq), mat(liquid, 0.25), [], 'liquido'));
  if (label) {
    const ly0 = labelY[0] * h, ly1 = labelY[1] * h;
    const band = prof.filter(([, y]) => y >= ly0 && y <= ly1).map(([a, y]) => [a * 1.012, y]);
    g.add(mesh(lathe(band), mat(label, 0.6, 0, { side: THREE.DoubleSide }), [], 'etiqueta'));
  }
  const rTop = prof[prof.length - 1][0];
  g.add(mesh(new THREE.CylinderGeometry(rTop * 1.08, rTop * 1.08, h * 0.035, 32), mat(cap, 0.35, 0.6), [0, h + h * 0.012, 0], 'tapa'));
  return g;
}
function lata({ h = 0.122, r = 0.033, color, band }) {
  const g = new THREE.Group();
  const alu = mat('#C8CCD0', 0.25, 1);
  const prof = [[0, 0.004], [r * 0.82, 0], [r, 0.012], [r, h - 0.014], [r * 0.82, h - 0.004], [r * 0.84, h], [0, h - 0.003]];
  g.add(mesh(lathe(prof, 48), alu));
  g.add(mesh(lathe([[r * 1.004, 0.014], [r * 1.004, h - 0.016]], 48), mat(color, 0.35, 0.3, { side: THREE.DoubleSide }), [], 'cuerpo'));
  if (band) g.add(mesh(lathe([[r * 1.008, h * 0.42], [r * 1.008, h * 0.58]], 48), mat(band, 0.4, 0.2, { side: THREE.DoubleSide })));
  return g;
}

// ---------- adiciones ----------
function aguacate() {
  const prof = smooth([[0, 0], [0.028, 0.006], [0.034, 0.03], [0.026, 0.06], [0.018, 0.08], [0.01, 0.095], [0, 0.1]]);
  const half = new THREE.Group();
  half.add(mesh(lathe(prof, 40, 0, Math.PI), mat('#2F4A1C', 0.75, 0, { side: THREE.DoubleSide })));
  const s = new THREE.Shape();
  prof.forEach(([r, y], i) => i ? s.lineTo(r, y) : s.moveTo(r, y));
  [...prof].reverse().forEach(([r, y]) => s.lineTo(-r, y));
  const cara = mesh(new THREE.ShapeGeometry(s, 24), mat('#CFE08A', 0.7, 0, { side: THREE.DoubleSide }));
  cara.rotation.y = -Math.PI / 2; half.add(cara);
  const semilla = mesh(new THREE.SphereGeometry(0.016, 32, 16, 0, Math.PI), mat('#7B4A26', 0.5), [0, 0.03, 0]);
  semilla.rotation.y = -Math.PI / 2; semilla.scale.set(1, 1.1, 1); half.add(semilla);
  half.rotation.z = -Math.PI / 2; half.position.y = 0.0345;
  const g = new THREE.Group(); g.add(half);
  const otra = half.clone(); otra.position.set(0.0, 0.0345, 0.085); otra.rotation.y = 0.5; g.add(otra);
  return g;
}
function queso() {
  const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.09, 0.022), new THREE.Vector2(0.09, -0.022)]);
  const g = new THREE.Group();
  const w = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }),
    mat('#F2C94C', 0.55));
  w.rotation.x = -Math.PI / 2; w.position.y = 0.002; g.add(w);
  const hueco = mat('#D9A928', 0.7);
  [[0.05, 0.046, 0.008], [0.07, 0.03, -0.01], [0.035, 0.02, 0.003]].forEach(([x, y, z]) =>
    g.add(mesh(new THREE.SphereGeometry(0.0055, 12, 8), hueco, [x, y, z + 0.0005])));
  g.position.x = -0.045;
  const root = new THREE.Group(); root.add(g); return root;
}

// ---------- generar ----------
await save('choripan', choripan(false));
await save('chori-doble', choripan(true));
await save('aguacate', aguacate());
await save('queso', queso());
await save('stella', botella({ h: 0.235, r: 0.03, glass: '#3E6B2F', liquid: '#C99A2E', label: '#F2EEE4', cap: '#B8962E' }));
await save('aguila', botella({ h: 0.235, r: 0.03, glass: '#5A3A12', opacity: 0.7, liquid: '#C99A2E', label: '#F2C12E', cap: '#C9A227' }));
await save('poker', botella({ h: 0.235, r: 0.03, glass: '#5A3A12', opacity: 0.7, liquid: '#C99A2E', label: '#C8202F', cap: '#C8202F' }));
await save('coronita', botella({ h: 0.17, r: 0.024, glass: '#F4F1E6', opacity: 0.35, liquid: '#E8C14A', label: '#1B3A8C', labelY: [0.5, 0.62], cap: '#E3C35A' }));
await save('solecita', botella({ h: 0.17, r: 0.024, glass: '#F4F1E6', opacity: 0.35, liquid: '#E8C14A', label: '#F08A24', labelY: [0.2, 0.45], cap: '#E3C35A' }));
await save('coca-250', botella({ h: 0.2, r: 0.029, glass: '#BFD8C8', opacity: 0.45, liquid: '#2A120B', fill: 0.86, label: '#C8102E', labelY: [0.3, 0.42], cap: '#C8102E', tipo: 'contour' }));
await save('coca-400', botella({ h: 0.22, r: 0.033, glass: '#EAF2EE', opacity: 0.3, liquid: '#2A120B', fill: 0.85, label: '#C8102E', labelY: [0.28, 0.45], cap: '#C8102E', tipo: 'pet' }));
await save('agua', botella({ h: 0.23, r: 0.033, glass: '#DCEFFA', opacity: 0.25, liquid: '#CFE9F7', fill: 0.85, label: '#2E7DC1', labelY: [0.3, 0.46], cap: '#2E7DC1', tipo: 'pet' }));
await save('soda-hatsu', lata({ color: '#E7A9C4', band: '#FFFFFF' }));
await save('te-hatsu', botella({ h: 0.2, r: 0.03, glass: '#F4F1E6', opacity: 0.35, liquid: '#D9A04A', fill: 0.88, label: '#F2EEE4', labelY: [0.2, 0.55], cap: '#E7A9C4', tipo: 'pet' }));
