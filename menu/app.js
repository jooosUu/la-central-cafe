import { MENU, COMBO } from './menu.js?v=9';

const $ = s => document.querySelector(s);
const fmt = n => '$' + n.toLocaleString('es-CO');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const poster = m => `img/posters/${m}.webp`;
const model = m => `models/${m}.glb`;
const svg = f => fetch(f).then(r => r.text());

// Si el menú lo sirve el servidor de la caja: precios y disponibilidad en vivo (si no, usa menu.js tal cual)
try {
  const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 2500);
  const r = await fetch('/api/carta', { signal: ctrl.signal });
  if (r.ok) {
    const vivo = new Map((await r.json()).map(p => [p.id, p]));
    for (const sec of MENU) for (const b of sec.bloques) b.items = b.items.filter(it => {
      const v = vivo.get(it.id); if (!v) return true;
      it.precio = v.precio; if (it.combo) it.combo = v.precio_combo ?? it.combo; it.agotado = v.agotado;
      return v.activo;
    });
  }
} catch { /* sin servidor: menú estático */ }

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
const btn3d = it => `<button type="button" class="ring b3d" data-id="${it.id}" aria-label="Ver ${it.nombre} en 3D">3D</button>`;
const fila = (it, extra = '') =>
  `<div class="fila${it.agotado ? ' agotado' : ''}"><span class="nom">${it.nombre}</span><span class="dots" aria-hidden="true"></span><span class="pre">${it.agotado ? 'agotado' : fmt(it.precio)}</span>${extra}</div>`;

function tab(id, texto) { const a = el('a', 'tab', texto); a.href = '#' + id; a.dataset.cat = id; tabs.append(a); }

for (const sec of MENU) {
  const s = el('section', 'cat'); s.id = sec.id;
  s.append(el('h2', 'cat-t', sec.titulo), el('hr', 'regla'));
  if (sec.bloques[0].tipo === 'destacado') tab(sec.id, sec.titulo);

  // contenedores para la grilla responsive: platos destacados y listas
  let dests = null, listas = null;
  for (const b of sec.bloques) {
    if (b.tipo === 'destacado') {
      dests ??= s.appendChild(el('div', 'dests'));
      for (const it of b.items) {
        byId[it.id] = it;
        const art = el('article', 'dest');
        art.innerHTML = `
          <button type="button" class="foto" data-id="${it.id}" aria-label="Ver ${it.nombre} en 3D">
            <img src="${poster(it.model)}" alt="" loading="lazy" decoding="async">${it.agotado ? '<span class="sello">agotado hoy</span>' : ''}
            <span class="ring">3D</span>
          </button>
          <div class="dest-body${it.agotado ? ' agotado' : ''}">
            <h3 class="dest-nom">${it.nombre}</h3>
            <div class="precios2">
              <div><small>sencillo</small><b>${it.agotado ? 'agotado' : fmt(it.precio)}</b></div>
              <div><small>combo</small><b>${it.agotado ? 'agotado' : fmt(it.combo)}</b><span>${COMBO.join('<br>')}</span></div>
            </div>
            <p class="desc">${it.desc}</p>
          </div>`;
        dests.append(art);
      }
    } else {
      const blk = el('div', 'lista'); if (b.id) blk.id = b.id;
      if (b.subtitulo) blk.append(el('h3', 'sub', b.subtitulo));
      if (b.id) tab(b.id, b.subtitulo.toLowerCase());
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
  const b = e.target.closest('[data-id]'); if (b) abrir(byId[b.dataset.id]);
});

function abrir(it) {
  mv.poster = poster(it.model);
  mv.src = model(it.model);
  mv.alt = `Modelo 3D de ${it.nombre}`;
  $('#v-nombre').textContent = it.nombre;
  $('#v-desc').textContent = it.desc || '';
  $('#v-precio').innerHTML = it.combo
    ? `<span><small>sencillo</small>${fmt(it.precio)}</span><span><small>combo</small>${fmt(it.combo)}<em>${COMBO.join(' · ')}</em></span>`
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
