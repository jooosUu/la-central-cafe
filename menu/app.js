import { MENU as MENU_FIJO, COMBO } from './menu.js?v=13';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => '$' + Number(n).toLocaleString('es-CO');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const poster = m => `img/posters/${m}.webp`;
const model = m => `models/${m}.glb`;
const svg = f => fetch(f).then(r => r.text());

// La carta sale de la caja (/api/carta). Sin servidor, se usa la carta fija de menu.js.
let MENU = MENU_FIJO.map(sec => ({ ...sec, bloques: sec.bloques.map(b => ({ ...b,
  items: b.items.map(it => ({ ...it, comboIncluye: it.combo ? COMBO : [] })) })) }));
try {
  const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 3000);
  const r = await fetch('/api/carta', { signal: ctrl.signal, cache: 'no-store' });
  if (r.ok) {
    const d = await r.json();
    if (d.secciones?.length) MENU = d.secciones;
  } else {
    aplicarDemoStore();
  }
} catch {
  aplicarDemoStore();
}

function aplicarDemoStore() {
  try {
    const localStore = localStorage.getItem('lc_demo_store');
    if (!localStore) return;
    const ds = JSON.parse(localStore);
    if (!ds?.productos?.length) return;
    for (const sec of MENU) {
      for (const b of sec.bloques) {
        for (const it of b.items) {
          const found = ds.productos.find(p => p.id === it.id);
          if (found) {
            it.precio = found.precio;
            if (found.precio_combo) it.combo = found.precio_combo;
            it.agotado = !found.activo;
          }
        }
      }
    }
  } catch {}
}
// ---------- marca (SVGs exportados del .ai, heredan el color con currentColor) ----------
svg('img/logo-horizontal.svg').then(s => { $('#logo').innerHTML = s; $('#foot-logo').innerHTML = s; });
Promise.all(['corazon', 'fuego', 'rapido', 'cafe'].map(n => svg(`img/icono-${n}.svg`))).then(list => {
  const html = list.join('');
  $('#iconos').innerHTML = html; $('#iconos-foot').innerHTML = html;
});

// Número de mesa: ?mesa=5
const mesa = new URLSearchParams(location.search).get('mesa');
if (mesa && /^\d{1,3}$/.test(mesa)) { $('#mesa').textContent = 'mesa ' + mesa; $('#mesa').hidden = false; }

// ---------- carta ----------
const tabs = $('#tabs'), carta = $('#carta');
const byId = {};
const btn3d = it => it.model
  ? `<button type="button" class="ring b3d" data-id="${esc(it.id)}" aria-label="Ver ${esc(it.nombre)} en 3D">3D</button>`
  : '<span class="ring b3d vacio" aria-hidden="true"></span>';
const fila = (it, extra = '') =>
  `<div class="fila${it.agotado ? ' agotado' : ''}"><span class="nom">${esc(it.nombre)}</span><span class="dots" aria-hidden="true"></span><span class="pre">${it.agotado ? 'agotado' : fmt(it.precio)}</span>${extra}</div>`;

function tab(id, texto) { const a = el('a', 'tab'); a.textContent = texto; a.href = '#' + id; a.dataset.cat = id; tabs.append(a); }

for (const sec of MENU) {
  const s = el('section', 'cat'); s.id = sec.id;
  const h2 = el('h2', 'cat-t'); h2.textContent = sec.titulo;
  s.append(h2, el('hr', 'regla'));
  if (sec.bloques[0].tipo === 'destacado') tab(sec.id, sec.titulo);

  // contenedores para la grilla responsive: platos destacados y listas
  let dests = null, listas = null;
  for (const b of sec.bloques) {
    if (b.tipo === 'destacado') {
      dests ??= s.appendChild(el('div', 'dests'));
      for (const it of b.items) {
        byId[it.id] = it;
        const art = el('article', 'dest');
        const foto = it.model
          ? `<button type="button" class="foto" data-id="${esc(it.id)}" aria-label="Ver ${esc(it.nombre)} en 3D">
              <img src="${poster(it.model)}" alt="" loading="lazy" decoding="async"><span class="ring">3D</span>`
          : `<div class="foto foto-vacia"><span class="marca" data-svg="img/taza.svg"></span>`;
        art.innerHTML = `
          ${foto}${it.agotado ? '<span class="sello">agotado hoy</span>' : ''}${it.model ? '</button>' : '</div>'}
          <div class="dest-body${it.agotado ? ' agotado' : ''}">
            <h3 class="dest-nom">${esc(it.nombre)}</h3>
            <div class="precios2${it.combo ? '' : ' uno'}">
              <div><small>${it.combo ? 'sencillo' : 'precio'}</small><b>${it.agotado ? 'agotado' : fmt(it.precio)}</b></div>
              ${it.combo ? `<div><small>combo</small><b>${it.agotado || it.comboAgotado ? 'agotado' : fmt(it.combo)}</b><span>${it.comboIncluye.map(esc).join('<br>')}</span></div>` : ''}
            </div>
            ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ''}
          </div>`;
        dests.append(art);
      }
    } else {
      const blk = el('div', 'lista'); if (b.id) blk.id = b.id;
      if (b.subtitulo && b.subtitulo.toLowerCase() !== sec.titulo.toLowerCase()) { const h3 = el('h3', 'sub'); h3.textContent = b.subtitulo; blk.append(h3); }
      if (b.id) tab(b.id, (b.subtitulo || sec.titulo).toLowerCase());
      const ul = el('ul');
      for (const it of b.items) {
        byId[it.id] = it;
        ul.append(el('li', null, fila(it) + btn3d(it)));
      }
      blk.append(ul);
      listas ??= s.appendChild(el('div', 'listas'));
      listas.append(blk);
    }
  }
  carta.append(s);
}
// marca para platos sin modelo 3D
document.querySelectorAll('[data-svg]').forEach(async e => { e.innerHTML = await svg(e.dataset.svg); });

// pestaña activa según scroll
const targets = [...tabs.querySelectorAll('.tab')].map(t => document.getElementById(t.dataset.cat));
const marcar = () => {
  const y = innerHeight * 0.35;
  let cur = targets[0];
  for (const t of targets) if (t.getBoundingClientRect().top <= y) cur = t;
  tabs.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.cat === cur.id;
    if (on && !t.classList.contains('on')) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    t.classList.toggle('on', on);
  });
};
addEventListener('scroll', marcar, { passive: true }); marcar();

// ---------- visor 3D / AR ----------
const visor = $('#visor'), mv = $('#mv');
carta.addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (b && byId[b.dataset.id]?.model) abrir(byId[b.dataset.id]);
});

function abrir(it) {
  mv.poster = poster(it.model);
  mv.src = model(it.model);
  mv.alt = `Modelo 3D de ${it.nombre}`;
  $('#v-nombre').textContent = it.nombre;
  $('#v-desc').textContent = it.desc || '';
  $('#v-precio').innerHTML = it.combo
    ? `<span><small>sencillo</small>${fmt(it.precio)}</span><span><small>combo</small>${fmt(it.combo)}<em>${it.comboIncluye.map(esc).join(' · ')}</em></span>`
    : `<span>${fmt(it.precio)}</span>`;
  visor.showModal();
  history.pushState({ visor: it.id }, '');
}
function cerrar() { if (visor.open) visor.close(); }
$('#v-close').addEventListener('click', () => history.back());
visor.addEventListener('click', e => { if (e.target === visor) history.back(); });
visor.addEventListener('cancel', e => { e.preventDefault(); history.back(); });
addEventListener('popstate', cerrar);   // botón "atrás" del celular cierra el visor

mv.addEventListener('progress', e => {
  const p = e.detail.totalProgress;
  $('#v-bar').style.width = (p * 100) + '%';
  $('#v-bar').parentElement.classList.toggle('done', p >= 1);
});
mv.addEventListener('load', () => {
  $('#v-bar').parentElement.classList.add('done');
  $('#v-noar').hidden = mv.canActivateAR;
});
mv.addEventListener('ar-status', e => { if (e.detail.status === 'failed') $('#v-noar').hidden = false; });

// Guarda el menú en el celular para que abra rápido aunque la señal sea mala (solo https o localhost)
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
