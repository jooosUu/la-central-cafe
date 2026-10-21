import { MENU as MENU_FIJO, COMBO } from './menu.js?v=13';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => '$' + Number(n || 0).toLocaleString('es-CO');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const poster = m => `img/posters/${m}.webp`;
const model = m => `models/${m}.glb`;
const svg = f => fetch(f).then(r => r.text());

// =================================================================== I18N (ES / EN)
const I18N = {
  es: {
    langCode: 'EN',
    introT: 'menú',
    hint: 'Toca <b>3D</b> para ver el plato y ponerlo sobre tu mesa.',
    searchPlaceholder: 'buscar café, choripán, bebidas…',
    cajaBadge: '🧾 caja / comanda',
    sencillo: 'sencillo',
    precio: 'precio',
    combo: 'combo',
    agotado: 'agotado',
    agotadoHoy: 'agotado hoy',
    pedir: '+ pedir',
    pedirCombo: '+ combo',
    verEnMesa: 'ver en mi mesa',
    tuPedido: 'tu pedido',
    mesaLugar: 'mesa o lugar:',
    tuNombre: 'tu nombre (opcional):',
    notas: 'instrucciones especiales:',
    totalPagar: 'total a pagar:',
    enviarCocina: '👨‍🍳 Enviar a Cocina',
    pedirWsp: '💬 Pedir por WhatsApp',
    vaciarPedido: 'vaciar pedido',
    preciosPie: 'Precios en pesos colombianos',
    calidadPie: 'La Central Café · Calidad de origen',
    pedidoVacio: 'Aún no has agregado productos a tu pedido.',
    pedidoEnviadoOk: '✅ ¡Pedido enviado a la cocina! Tu orden fue registrada. En breve te lo servimos a la mesa.',
    mesaPrefijo: 'mesa '
  },
  en: {
    langCode: 'ES',
    introT: 'menu',
    hint: 'Tap <b>3D</b> to view the dish in Augmented Reality on your table.',
    searchPlaceholder: 'search coffee, food, drinks…',
    cajaBadge: '🧾 pos / orders',
    sencillo: 'single',
    precio: 'price',
    combo: 'combo',
    agotado: 'sold out',
    agotadoHoy: 'sold out today',
    pedir: '+ order',
    pedirCombo: '+ combo',
    verEnMesa: 'view on table',
    tuPedido: 'your order',
    mesaLugar: 'table or place:',
    tuNombre: 'your name (optional):',
    notas: 'special instructions:',
    totalPagar: 'total to pay:',
    enviarCocina: '👨‍🍳 Send to Kitchen',
    pedirWsp: '💬 Order via WhatsApp',
    vaciarPedido: 'clear order',
    preciosPie: 'Prices in Colombian Pesos (COP)',
    calidadPie: 'La Central Café · Origin Coffee',
    pedidoVacio: 'Your order is currently empty.',
    pedidoEnviadoOk: '✅ Order sent to kitchen! Your ticket is registered. We will bring it to your table shortly.',
    mesaPrefijo: 'table '
  }
};
let lang = localStorage.getItem('lc_lang') === 'en' ? 'en' : 'es';

function aplicarIdioma() {
  const t = I18N[lang];
  $('#lang-label').textContent = t.langCode;
  $('#txt-intro-t').textContent = t.introT;
  $('#txt-hint').innerHTML = t.hint;
  $('#menu-search').placeholder = t.searchPlaceholder;
  $('#txt-pie-precios').textContent = t.preciosPie;
  $('#txt-pie-test').textContent = t.calidadPie;
  $('#cart-title').textContent = t.tuPedido;
  $('#lbl-mesa').textContent = t.mesaLugar;
  $('#lbl-nombre').textContent = t.tuNombre;
  $('#lbl-notas').textContent = t.notas;
  $('#lbl-total').textContent = t.totalPagar;
  $('#btn-enviar-cocina span').textContent = t.enviarCocina;
  $('#btn-enviar-wsp span').textContent = t.pedirWsp;
  $('#btn-vaciar-cart').textContent = t.vaciarPedido;
  const verMesa = $('#txt-ver-mesa');
  if (verMesa) verMesa.textContent = t.verEnMesa;
}

$('#btn-lang').onclick = () => {
  lang = lang === 'es' ? 'en' : 'es';
  localStorage.setItem('lc_lang', lang);
  aplicarIdioma();
  actualizarUICarrito();
};

// =================================================================== DATOS DE CARTA
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

// ---------- marca SVGs ----------
svg('img/logo-horizontal.svg').then(s => { $('#logo').innerHTML = s; $('#foot-logo').innerHTML = s; });
Promise.all(['corazon', 'fuego', 'rapido', 'cafe'].map(n => svg(`img/icono-${n}.svg`))).then(list => {
  const html = list.join('');
  $('#iconos').innerHTML = html; $('#iconos-foot').innerHTML = html;
});

// Mesa en query param: ?mesa=5
const mesaParam = new URLSearchParams(location.search).get('mesa');
let mesaActual = 'Mesa 1';
if (mesaParam && /^\d{1,3}$/.test(mesaParam)) {
  mesaActual = 'Mesa ' + mesaParam;
  $('#mesa').textContent = I18N[lang].mesaPrefijo + mesaParam;
  $('#mesa').hidden = false;
  const optFound = [...$('#cart-mesa-select').options].find(o => o.value === mesaActual);
  if (optFound) $('#cart-mesa-select').value = mesaActual;
  $('#cart-mesa-pill').textContent = mesaActual;
}

$('#cart-mesa-select').onchange = () => {
  mesaActual = $('#cart-mesa-select').value;
  $('#cart-mesa-pill').textContent = mesaActual;
};

// =================================================================== CARRITO & COMANDAS
let cart = [];
try {
  const savedCart = localStorage.getItem('lc_cliente_cart');
  if (savedCart) cart = JSON.parse(savedCart);
} catch { cart = []; }

function guardarCarrito() {
  localStorage.setItem('lc_cliente_cart', JSON.stringify(cart));
  actualizarUICarrito();
}

function agregarAlCarrito(itemId, variante = 'sencillo') {
  const it = byId[itemId];
  if (!it || it.agotado) return;
  const precioUnit = (variante === 'combo' && it.combo) ? it.combo : it.precio;
  const index = cart.findIndex(c => c.id === it.id && c.variante === variante);
  if (index >= 0) {
    cart[index].cantidad += 1;
  } else {
    cart.push({
      id: it.id,
      nombre: it.nombre,
      variante: variante,
      precio: precioUnit,
      cantidad: 1
    });
  }
  guardarCarrito();
  // Feedback sutil en botón flotante
  const b = $('#btn-cart-float');
  b.style.transform = 'scale(1.15)';
  setTimeout(() => b.style.transform = '', 180);
}

function modificarCantidad(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].cantidad += delta;
  if (cart[idx].cantidad <= 0) {
    cart.splice(idx, 1);
  }
  guardarCarrito();
}

function vaciarCarrito() {
  cart = [];
  guardarCarrito();
}

function actualizarUICarrito() {
  const totalCount = cart.reduce((acc, it) => acc + it.cantidad, 0);
  const totalVal = cart.reduce((acc, it) => acc + (it.precio * it.cantidad), 0);

  $('#cart-count').textContent = totalCount;
  $('#cart-subtotal').textContent = fmt(totalVal);
  $('#cart-total-val').textContent = fmt(totalVal);

  const btnFloat = $('#btn-cart-float');
  if (totalCount > 0) {
    btnFloat.hidden = false;
  } else {
    btnFloat.hidden = true;
  }

  const listEl = $('#cart-items-list');
  if (!cart.length) {
    listEl.innerHTML = `<div class="cart-vacio">${esc(I18N[lang].pedidoVacio)}</div>`;
    return;
  }

  listEl.innerHTML = cart.map((it, idx) => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <span class="cart-item-title">${esc(it.nombre)}</span>
        <span class="cart-item-variant">${esc(it.variante === 'combo' ? 'Combo completo' : 'Sencillo')} · ${fmt(it.precio)}</span>
      </div>
      <div class="cart-item-qty">
        <button type="button" class="cart-qty-btn" data-cminus="${idx}">-</button>
        <span class="cart-qty-num">${it.cantidad}</span>
        <button type="button" class="cart-qty-btn" data-cplus="${idx}">+</button>
      </div>
      <span class="cart-item-price">${fmt(it.precio * it.cantidad)}</span>
    </div>
  `).join('');

  $$('[data-cminus]', listEl).forEach(b => b.onclick = () => modificarCantidad(Number(b.dataset.cminus), -1));
  $$('[data-cplus]', listEl).forEach(b => b.onclick = () => modificarCantidad(Number(b.dataset.cplus), 1));
}

// Eventos de apertura / cierre del carrito
$('#btn-cart-float').onclick = () => $('#cart-drawer').showModal();
$('#cart-close').onclick = () => $('#cart-drawer').close();
$('#btn-vaciar-cart').onclick = () => vaciarCarrito();
$('#cart-drawer').addEventListener('click', e => { if (e.target === $('#cart-drawer')) $('#cart-drawer').close(); });

// Enviar a Cocina (KDS directo)
$('#btn-enviar-cocina').onclick = async () => {
  if (!cart.length) return;
  const mesaSel = $('#cart-mesa-select').value || 'Mesa 1';
  const cliente = $('#cart-nombre-input').value.trim();
  const notas = $('#cart-notas-input').value.trim();
  const comanda = {
    mesa: mesaSel,
    cliente: cliente || 'Cliente Menú',
    notas: notas,
    items: cart.map(it => ({
      producto_id: it.id,
      nombre: it.nombre + (it.variante === 'combo' ? ' (Combo)' : ''),
      precio: it.precio,
      variante: it.variante,
      cantidad: it.cantidad
    }))
  };

  let ok = false;
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('/api/comandas', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comanda)
    });
    if (r.ok) ok = true;
  } catch {}

  // Soporte cliente estático / Render demo mode
  try {
    const raw = localStorage.getItem('lc_demo_store');
    const store = raw ? JSON.parse(raw) : {};
    store.comandas = store.comandas || [];
    const newId = (store.comandas[store.comandas.length - 1]?.id || 0) + 1;
    store.comandas.push({
      id: newId,
      mesa: comanda.mesa,
      cliente: comanda.cliente,
      notas: comanda.notas,
      estado: 'pendiente',
      fecha: new Date().toISOString(),
      items: comanda.items
    });
    localStorage.setItem('lc_demo_store', JSON.stringify(store));
    localStorage.setItem('lc_comanda_ping', String(Date.now()));
    window.dispatchEvent(new Event('storage'));
    ok = true;
  } catch {}

  vaciarCarrito();
  $('#cart-drawer').close();
  alert(I18N[lang].pedidoEnviadoOk);
};

// Pedir por WhatsApp
$('#btn-enviar-wsp').onclick = () => {
  if (!cart.length) return;
  const mesaSel = $('#cart-mesa-select').value || 'Mesa 1';
  const cliente = $('#cart-nombre-input').value.trim();
  const notas = $('#cart-notas-input').value.trim();
  const total = cart.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

  let msg = `*☕ PEDIDO DESDE EL MENÚ DIGITAL - LA CENTRAL CAFÉ*\n`;
  msg += `*${mesaSel}*${cliente ? ` · ${cliente}` : ''}\n`;
  msg += `--------------------------------------\n`;
  for (const it of cart) {
    msg += `• ${it.cantidad}x ${it.nombre}${it.variante === 'combo' ? ' (Combo)' : ''} - ${fmt(it.precio * it.cantidad)}\n`;
  }
  msg += `--------------------------------------\n`;
  msg += `*TOTAL:* ${fmt(total)}\n`;
  if (notas) msg += `*Notas:* ${notas}\n`;
  msg += `\n¡Por favor confirmar pedido!`;

  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

// =================================================================== RENDERIZADO CARTA
const tabs = $('#tabs'), carta = $('#carta');
const byId = {};

const btn3d = it => it.model
  ? `<button type="button" class="ring b3d" data-id="${esc(it.id)}" aria-label="Ver ${esc(it.nombre)} en 3D">3D</button>`
  : '<span class="ring b3d vacio" aria-hidden="true"></span>';

const fila = (it, extra = '') =>
  `<div class="fila${it.agotado ? ' agotado' : ''}"><span class="nom">${esc(it.nombre)}</span><span class="dots" aria-hidden="true"></span><span class="pre">${it.agotado ? I18N[lang].agotado : fmt(it.precio)}</span>${extra}</div>`;

function tab(id, texto) { const a = el('a', 'tab'); a.textContent = texto; a.href = '#' + id; a.dataset.cat = id; tabs.append(a); }

for (const sec of MENU) {
  const s = el('section', 'cat'); s.id = sec.id;
  const h2 = el('h2', 'cat-t'); h2.textContent = sec.titulo;
  s.append(h2, el('hr', 'regla'));
  if (sec.bloques[0]?.tipo === 'destacado') tab(sec.id, sec.titulo);

  let dests = null, listas = null;
  for (const b of sec.bloques) {
    if (b.tipo === 'destacado') {
      dests ??= s.appendChild(el('div', 'dests'));
      for (const it of b.items) {
        byId[it.id] = it;
        const art = el('article', 'dest');
        art.dataset.pid = it.id;
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
            ${!it.agotado ? `
            <div class="dest-actions">
              <button type="button" class="btn-pedir" data-add="${esc(it.id)}" data-var="sencillo">+ pedir</button>
              ${it.combo && !it.comboAgotado ? `<button type="button" class="btn-pedir btn-pedir-combo" data-add="${esc(it.id)}" data-var="combo">+ combo</button>` : ''}
            </div>` : ''}
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
        const li = el('li');
        li.dataset.pid = it.id;
        li.innerHTML = fila(it) + (it.agotado ? '' : `<button type="button" class="btn-add-item" data-add="${esc(it.id)}" data-var="sencillo" title="Agregar">+ pedir</button>`) + btn3d(it);
        ul.append(li);
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

// =================================================================== BUSCADOR INSTANTÁNEO
const searchInput = $('#menu-search');
const searchClear = $('#search-clear');

function filtrarCarta(q) {
  const norm = q.trim().toLowerCase();
  searchClear.hidden = norm.length === 0;

  for (const sec of $$('.cat')) {
    let secHasVisible = false;
    for (const art of $$('.dest, .lista li', sec)) {
      const it = byId[art.dataset.pid];
      if (!it) continue;
      const match = !norm || it.nombre.toLowerCase().includes(norm) || (it.desc && it.desc.toLowerCase().includes(norm));
      art.style.display = match ? '' : 'none';
      if (match) secHasVisible = true;
    }
    sec.style.display = secHasVisible ? '' : 'none';
  }
}

searchInput.oninput = () => filtrarCarta(searchInput.value);
searchClear.onclick = () => {
  searchInput.value = '';
  filtrarCarta('');
  searchInput.focus();
};

// =================================================================== PESTAÑAS Y SCROLL
const targets = [...tabs.querySelectorAll('.tab')].map(t => document.getElementById(t.dataset.cat)).filter(Boolean);
const marcar = () => {
  const y = innerHeight * 0.35;
  let cur = targets[0];
  for (const t of targets) {
    if (t.getBoundingClientRect().top <= y) cur = t;
  }
  if (!cur) return;
  tabs.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.cat === cur.id;
    if (on && !t.classList.contains('on')) {
      const targetLeft = t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2;
      tabs.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
    t.classList.toggle('on', on);
  });
};
addEventListener('scroll', marcar, { passive: true });
marcar();

// =================================================================== EVENTOS DE PEDIR
carta.addEventListener('click', e => {
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) {
    e.stopPropagation();
    agregarAlCarrito(addBtn.dataset.add, addBtn.dataset.var || 'sencillo');
    return;
  }
  const b = e.target.closest('[data-id]');
  if (b && byId[b.dataset.id]?.model) {
    abrir(byId[b.dataset.id]);
  }
});

// =================================================================== VISOR 3D / AR
const visor = $('#visor'), mv = $('#mv');

function abrir(it) {
  mv.poster = poster(it.model);
  mv.src = model(it.model);
  mv.alt = `Modelo 3D de ${it.nombre}`;
  $('#v-nombre').textContent = it.nombre;
  $('#v-desc').textContent = it.desc || '';
  $('#v-precio').innerHTML = it.combo
    ? `<span><small>${I18N[lang].sencillo}</small>${fmt(it.precio)}</span><span><small>${I18N[lang].combo}</small>${fmt(it.combo)}<em>${it.comboIncluye.map(esc).join(' · ')}</em></span>`
    : `<span>${fmt(it.precio)}</span>`;
  
  const pWrap = $('#v-pedir-wrap');
  if (pWrap) {
    pWrap.innerHTML = !it.agotado ? `
      <button type="button" class="btn-pedir" id="v-add-sencillo">+ pedir ${esc(it.nombre)}</button>
      ${it.combo && !it.comboAgotado ? `<button type="button" class="btn-pedir btn-pedir-combo" id="v-add-combo">+ combo</button>` : ''}
    ` : '<span class="sello">agotado</span>';
    
    $('#v-add-sencillo')?.addEventListener('click', () => {
      agregarAlCarrito(it.id, 'sencillo');
      cerrar();
    });
    $('#v-add-combo')?.addEventListener('click', () => {
      agregarAlCarrito(it.id, 'combo');
      cerrar();
    });
  }

  visor.showModal();
  history.pushState({ visor: it.id }, '');
}

function cerrar() { if (visor.open) visor.close(); }
$('#v-close').addEventListener('click', () => history.back());
visor.addEventListener('click', e => { if (e.target === visor) history.back(); });
visor.addEventListener('cancel', e => { e.preventDefault(); history.back(); });
addEventListener('popstate', cerrar);

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

// Inicializar idioma y carrito
aplicarIdioma();
actualizarUICarrito();

// Service Worker
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
