import { MENU as MENU_FIJO, COMBO } from './menu.js?v=14';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => '$' + Number(n || 0).toLocaleString('es-CO');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const poster = m => `img/posters/${m}.webp`;
const model = m => `models/${m}.glb`;
const svg = f => fetch(f).then(r => r.text());

// Palabra de la portada de noche ya convertida a trazos (Utendo ExtraBold), para que el filtro SVG no dependa de la fuente.
const NOCHE_W = {"es": "M105.2 112.2Q105.2 108.3 103.8 104.7Q102.3 101.1 99.8 98.5Q97.4 95.8 94.1 94.2Q90.8 92.6 87.1 92.6Q83.4 92.6 80.2 94.2Q76.9 95.8 74.4 98.5Q71.9 101.1 70.5 104.7Q69.0 108.3 69.0 112.2Q69.0 116.2 70.5 119.8Q71.9 123.4 74.4 126.1Q76.9 128.8 80.2 130.4Q83.4 132.0 87.1 132.0Q90.8 132.0 94.1 130.4Q97.4 128.8 99.8 126.1Q102.3 123.4 103.8 119.8Q105.2 116.2 105.2 112.2ZM133.8 112.3Q133.8 121.3 130.7 129.1Q127.6 137.0 122.3 142.9Q117.0 148.8 109.9 152.2Q102.8 155.5 94.6 155.5Q87.4 155.5 81.2 152.8Q75.0 150.1 69.8 145.4V184.2H40.7V72.2H69.8V79.2Q75.0 74.6 81.2 71.8Q87.4 69.1 94.6 69.1Q102.8 69.1 109.9 72.5Q117.0 75.8 122.3 81.8Q127.6 87.7 130.7 95.5Q133.8 103.4 133.8 112.3ZM165.7 112.2Q165.7 116.2 167.1 119.8Q168.6 123.4 171.0 126.1Q173.5 128.8 176.8 130.4Q180.1 132.0 183.8 132.0Q187.4 132.0 190.7 130.4Q194.0 128.8 196.5 126.1Q199.0 123.4 200.4 119.8Q201.8 116.2 201.8 112.2Q201.8 108.3 200.4 104.7Q199.0 101.1 196.5 98.5Q194.0 95.8 190.7 94.2Q187.4 92.6 183.8 92.6Q180.1 92.6 176.8 94.2Q173.5 95.8 171.0 98.5Q168.6 101.1 167.1 104.7Q165.7 108.3 165.7 112.2ZM137.0 112.3Q137.0 103.4 140.2 95.5Q143.3 87.7 148.6 81.8Q153.8 75.8 161.0 72.5Q168.1 69.1 176.2 69.1Q183.4 69.1 189.7 71.8Q195.9 74.6 201.0 79.2V72.0H230.2V152.0H201.0V145.4Q195.9 150.1 189.7 152.8Q183.4 155.5 176.2 155.5Q168.1 155.5 161.0 152.2Q153.8 148.8 148.6 142.9Q143.3 137.0 140.2 129.1Q137.0 121.3 137.0 112.3ZM290.8 94.7Q279.8 94.4 274.5 99.8Q269.2 105.3 269.2 114.7V152.0H240.1V72.0H269.2V81.0Q273.2 74.7 279.1 72.1Q285.0 69.4 290.8 69.8ZM346.8 94.7Q335.8 94.4 330.5 99.8Q325.2 105.3 325.2 114.7V152.0H296.1V72.0H325.2V81.0Q329.2 74.7 335.1 72.1Q341.0 69.4 346.8 69.8ZM349.8 48.6Q349.8 45.4 351.2 42.7Q352.6 40.0 354.9 37.8Q357.2 35.7 360.2 34.5Q363.3 33.3 366.8 33.3Q370.3 33.3 373.4 34.5Q376.4 35.7 378.7 37.8Q381.0 40.0 382.4 42.7Q383.8 45.4 383.8 48.6Q383.8 51.7 382.4 54.5Q381.0 57.3 378.7 59.4Q376.4 61.6 373.4 62.8Q370.3 64.0 366.8 64.0Q363.3 64.0 360.2 62.8Q357.2 61.6 354.9 59.4Q352.6 57.3 351.2 54.5Q349.8 51.7 349.8 48.6ZM352.2 72.0H381.4V152.0H352.2ZM420.6 152.0H391.4V40.0H420.6ZM459.6 152.0H430.5V40.0H459.6ZM494.8 112.2Q494.8 116.2 496.2 119.8Q497.7 123.4 500.2 126.1Q502.6 128.8 505.9 130.4Q509.2 132.0 512.9 132.0Q516.6 132.0 519.8 130.4Q523.1 128.8 525.6 126.1Q528.1 123.4 529.5 119.8Q531.0 116.2 531.0 112.2Q531.0 108.3 529.5 104.7Q528.1 101.1 525.6 98.5Q523.1 95.8 519.8 94.2Q516.6 92.6 512.9 92.6Q509.2 92.6 505.9 94.2Q502.6 95.8 500.2 98.5Q497.7 101.1 496.2 104.7Q494.8 108.3 494.8 112.2ZM466.2 112.3Q466.2 103.4 469.3 95.5Q472.4 87.7 477.7 81.8Q483.0 75.8 490.1 72.5Q497.2 69.1 505.4 69.1Q512.6 69.1 518.8 71.8Q525.0 74.6 530.2 79.2V72.0H559.3V152.0H530.2V145.4Q525.0 150.1 518.8 152.8Q512.6 155.5 505.4 155.5Q497.2 155.5 490.1 152.2Q483.0 148.8 477.7 142.9Q472.4 137.0 469.3 129.1Q466.2 121.3 466.2 112.3Z", "en": "M193.7 112.2Q193.7 116.2 195.1 119.8Q196.6 123.4 199.0 126.1Q201.5 128.8 204.8 130.4Q208.1 132.0 211.8 132.0Q215.4 132.0 218.7 130.4Q222.0 128.8 224.5 126.1Q227.0 123.4 228.4 119.8Q229.8 116.2 229.8 112.2Q229.8 108.3 228.4 104.7Q227.0 101.1 224.5 98.5Q222.0 95.8 218.7 94.2Q215.4 92.6 211.8 92.6Q208.1 92.6 204.8 94.2Q201.5 95.8 199.0 98.5Q196.6 101.1 195.1 104.7Q193.7 108.3 193.7 112.2ZM165.0 112.3Q165.0 103.4 168.2 95.5Q171.3 87.7 176.6 81.8Q181.8 75.8 189.0 72.5Q196.1 69.1 204.2 69.1Q211.4 69.1 217.7 71.8Q223.9 74.6 229.0 79.2V72.2H258.2V149.4Q258.2 161.3 254.2 169.9Q250.2 178.6 243.5 184.2Q236.9 189.8 228.4 192.6Q219.9 195.4 210.8 195.4Q196.2 195.4 185.2 189.7Q174.2 184.0 166.6 175.5L185.4 160.2Q190.0 164.5 195.8 167.8Q201.5 171.2 209.2 171.2Q213.0 171.2 216.6 170.0Q220.1 168.8 222.9 166.2Q225.7 163.7 227.4 159.8Q229.0 156.0 229.0 150.9V145.4Q223.9 150.1 217.7 152.8Q211.4 155.5 204.2 155.5Q196.1 155.5 189.0 152.2Q181.8 148.8 176.6 142.9Q171.3 137.0 168.2 129.1Q165.0 121.3 165.0 112.3ZM318.8 94.7Q307.8 94.4 302.5 99.8Q297.2 105.3 297.2 114.7V152.0H268.1V72.0H297.2V81.0Q301.2 74.7 307.1 72.1Q313.0 69.4 318.8 69.8ZM321.8 48.6Q321.8 45.4 323.2 42.7Q324.6 40.0 326.9 37.8Q329.2 35.7 332.2 34.5Q335.3 33.3 338.8 33.3Q342.3 33.3 345.4 34.5Q348.4 35.7 350.7 37.8Q353.0 40.0 354.4 42.7Q355.8 45.4 355.8 48.6Q355.8 51.7 354.4 54.5Q353.0 57.3 350.7 59.4Q348.4 61.6 345.4 62.8Q342.3 64.0 338.8 64.0Q335.3 64.0 332.2 62.8Q329.2 61.6 326.9 59.4Q324.6 57.3 323.2 54.5Q321.8 51.7 321.8 48.6ZM324.2 72.0H353.4V152.0H324.2ZM392.6 152.0H363.4V40.0H392.6ZM431.6 152.0H402.5V40.0H431.6Z"};

// =================================================================== I18N (ES / EN)
const I18N = {
  es: {
    langCode: 'EN',
    introT: 'café',
    nocheK: 'la central · tunja · jue a sáb · 4 a 10 pm',
    porConfirmar: 'por confirmar',
    nocheW: 'parrilla',
    nocheT: 'café de día, fuego de noche',
    hint: 'Toca <b>3D</b> para ver el plato y ponerlo sobre tu mesa.',
    searchPlaceholder: 'buscar café, choripán, bebidas…',
    searchPlaceholderDia: 'buscar café, horneados, bebidas…',
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
    pedirWsp: 'Pedir por WhatsApp',
    vaciarPedido: 'vaciar pedido',
    calidadPie: 'La Central · Calidad de origen',
    pedidoVacio: 'Aún no has agregado productos a tu pedido.',
    mesaPrefijo: 'mesa ',
    reviewPill: 'califícanos',
    mapsTitle: 'visítanos en Tunja',
    mapsDesc: 'La Central · Calidad de origen, filtrados y buena vibra en Tunja, Boyacá.',
    igDesc: 'Fotos de nuestros cafés de origen, nuevos granos, métodos de extracción y eventos especiales.',
    fbTitle: '¡pedido en cocina!',
    fbSubtitle: 'Tu orden está siendo preparada. En breve te la llevamos a tu mesa.',
    fbQuestion: '¿Cómo va tu experiencia hoy con nosotros?',
    fbStarHint: 'Toca las estrellas para calificar',
    fbCheerTitle: '¡Nos alegra mucho! ',
    fbCheerDesc: 'Tu reseña de 5 estrellas nos ayuda un montón a que más personas descubran nuestro café en Tunja. ¿Nos regalas tu opinión en Google Maps?',
    fbGoogleBtn: 'Dejar reseña de 5★ en Google Maps',
    fbIgBtn: 'Seguirnos en Instagram @lacentral.tunja',
    fbLowTitle: 'Queremos que tu visita sea perfecta',
    fbLowDesc: 'Cuéntanos qué podemos solucionar o mejorar para ti antes de que te vayas:',
    fbSendBtn: 'Enviar sugerencia a la barra',
    fbSentOk: '✓ ¡Gracias por tus comentarios! Ya se lo notificamos al equipo.',
    fbBackBtn: 'Volver a la carta'
  },
  en: {
    langCode: 'ES',
    introT: 'café',
    nocheK: 'la central · tunja · thu–sat · 4–10 pm',
    porConfirmar: 'ask us',
    nocheW: 'grill',
    nocheT: 'coffee by day, fire by night',
    hint: 'Tap <b>3D</b> to view the dish in Augmented Reality on your table.',
    searchPlaceholder: 'search coffee, food, drinks…',
    searchPlaceholderDia: 'search coffee, pastries, drinks…',
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
    pedirWsp: 'Order via WhatsApp',
    vaciarPedido: 'clear order',
    calidadPie: 'La Central · Origin Coffee',
    pedidoVacio: 'Your order is currently empty.',
    mesaPrefijo: 'table ',
    reviewPill: 'review us',
    mapsTitle: 'visit us in Tunja',
    mapsDesc: 'La Central · Specialty origin coffee, pour-overs and good vibes in Tunja, Boyacá.',
    igDesc: 'Photos of our origin beans, brewing methods, specialty coffee and community events.',
    fbTitle: 'order in kitchen!',
    fbSubtitle: 'Your order is being prepared. We will bring it to your table shortly.',
    fbQuestion: 'How is your experience with us today?',
    fbStarHint: 'Tap the stars to rate',
    fbCheerTitle: 'We are thrilled! ',
    fbCheerDesc: 'Your 5-star review helps more coffee lovers find us in Tunja. Would you leave us a review on Google Maps?',
    fbGoogleBtn: 'Leave a 5★ review on Google Maps',
    fbIgBtn: 'Follow on Instagram @lacentral.tunja',
    fbLowTitle: 'We want your visit to be perfect',
    fbLowDesc: 'Tell us what we can improve or fix for you right now:',
    fbSendBtn: 'Send feedback to the bar',
    fbSentOk: '✓ Thank you for your feedback! The team has been notified.',
    fbBackBtn: 'Back to menu'
  }
};
let lang = localStorage.getItem('lc_lang') === 'en' ? 'en' : 'es';

function aplicarIdioma() {
  const t = I18N[lang];
  $('#lang-label').textContent = t.langCode;
  $('#txt-intro-t').textContent = t.introT;
  const nk = $('#txt-noche-k'), nw = $('#txt-noche-w'), nt = $('#txt-noche-t');
  if (nk) nk.textContent = t.nocheK;
  if (nw) nw.setAttribute('d', NOCHE_W[lang]);
  if (nt) nt.textContent = t.nocheT;
  const dt = $('#txt-dia-t'); if (dt) dt.textContent = t.nocheT;
  $('#txt-hint').innerHTML = t.hint;
  $('#menu-search').placeholder = document.documentElement.dataset.modo === 'parrilla' ? t.searchPlaceholder : t.searchPlaceholderDia;
  $('#txt-pie-test').textContent = t.calidadPie;
  $('#cart-title').textContent = t.tuPedido;
  $('#lbl-mesa').textContent = t.mesaLugar;
  $('#lbl-nombre').textContent = t.tuNombre;
  $('#lbl-notas').textContent = t.notas;
  $('#lbl-total').textContent = t.totalPagar;
  const btnWsp = $('#txt-pedir-wsp');
  if (btnWsp) btnWsp.textContent = t.pedirWsp;
  $('#btn-vaciar-cart').textContent = t.vaciarPedido;
  const verMesa = $('#txt-ver-mesa');
  if (verMesa) verMesa.textContent = t.verEnMesa;
  const revPill = $('#txt-review-pill');
  if (revPill) revPill.textContent = t.reviewPill;
  const mt = $('#txt-maps-title');
  if (mt) mt.textContent = t.mapsTitle;
  const md = $('#txt-maps-desc');
  if (md) md.textContent = t.mapsDesc;
  const id = $('#txt-ig-desc');
  if (id) id.textContent = t.igDesc;
  const fbt = $('#fb-title');
  if (fbt) fbt.textContent = t.fbTitle;
  const fbs = $('#fb-subtitle');
  if (fbs) fbs.textContent = t.fbSubtitle;
  const fbq = $('#fb-question');
  if (fbq) fbq.textContent = t.fbQuestion;
  const fbst = $('#fb-star-text');
  if (fbst) fbst.textContent = t.fbStarHint;
  const fbct = $('#fb-cheer-title');
  if (fbct) fbct.textContent = t.fbCheerTitle;
  const fbcd = $('#fb-cheer-desc');
  if (fbcd) fbcd.textContent = t.fbCheerDesc;
  const fbg = $('#btn-fb-google-direct span');
  if (fbg) fbg.textContent = t.fbGoogleBtn;
  const fbi = $('.btn-fb-instagram span');
  if (fbi) fbi.textContent = t.fbIgBtn;
  const fblt = $('#fb-low-title');
  if (fblt) fblt.textContent = t.fbLowTitle;
  const fbld = $('#fb-low-desc');
  if (fbld) fbld.textContent = t.fbLowDesc;
  const fbsb = $('#txt-send-opinion');
  if (fbsb) fbsb.textContent = t.fbSendBtn;
  const fbb = $('#btn-fb-close');
  if (fbb) fbb.textContent = t.fbBackBtn;
  if (mesaParam && /^\d{1,3}$/.test(mesaParam)) $('#mesa').textContent = t.mesaPrefijo + mesaParam;
  if (typeof renderCarta === 'function' && $('#carta')?.children.length) renderCarta();
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
let whatsappDestino = '';

try {
  const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 3000);
  const r = await fetch('/api/carta', { signal: ctrl.signal, cache: 'no-store' });
  if (r.ok) {
    const d = await r.json();
    if (d.secciones?.length) MENU = d.secciones;
    if (d.whatsapp) whatsappDestino = String(d.whatsapp).replace(/\D/g, '');
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
svg('img/llama.svg?v=3').then(s => { const nl = $('#noche-llama'); if (nl) nl.innerHTML = s; });
svg('img/logo-horizontal.svg?v=3').then(s => { $('#logo').innerHTML = s; $('#foot-logo').innerHTML = s; });
Promise.all(['corazon', 'fuego', 'rapido', 'cafe'].map(n => svg(`img/icono-${n}.svg`))).then(list => {
  const html = list.join('');
  ['#iconos', '#iconos-foot'].forEach(s => { const el = $(s); if (el) el.innerHTML = html; });
});

// Mesa en query param: ?mesa=5
const mesaParam = new URLSearchParams(location.search).get('mesa');
let mesaActual = 'Mesa 1';
if (mesaParam && /^\d{1,3}$/.test(mesaParam)) {
  mesaActual = 'Mesa ' + mesaParam;
  $('#mesa').textContent = I18N[lang].mesaPrefijo + mesaParam;
  $('#mesa').hidden = false;
  const sel = $('#cart-mesa-select');
  if (![...sel.options].some(o => o.value === mesaActual)) {
    const opt = document.createElement('option');
    opt.value = mesaActual; opt.textContent = mesaActual;
    sel.prepend(opt);
  }
  sel.value = mesaActual;
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
  if (!it || it.agotado || !(it.precio > 0)) return;
  if (variante === 'combo' && (!(it.combo > 0) || it.comboAgotado)) return;
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
        <span class="cart-item-variant">${esc(it.variante === 'combo' ? I18N[lang].combo : I18N[lang].sencillo)} · ${fmt(it.precio)}</span>
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

// Pedir por WhatsApp
$('#btn-enviar-wsp').onclick = () => {
  if (!cart.length) return;
  const mesaSel = $('#cart-mesa-select').value || 'Mesa 1';
  const cliente = $('#cart-nombre-input').value.trim();
  const notas = $('#cart-notas-input').value.trim();
  const total = cart.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

  let msg = `*PEDIDO DESDE EL MENÚ DIGITAL - LA CENTRAL · TUNJA*\n`;
  msg += `*${mesaSel}*${cliente ? ` · ${cliente}` : ''}\n`;
  msg += `--------------------------------------\n`;
  for (const it of cart) {
    msg += `• ${it.cantidad}x ${it.nombre}${it.variante === 'combo' ? ' (Combo)' : ''} - ${fmt(it.precio * it.cantidad)}\n`;
  }
  msg += `--------------------------------------\n`;
  msg += `*TOTAL:* ${fmt(total)}\n`;
  if (notas) msg += `*Notas:* ${notas}\n`;
  msg += `\n¡Hola! Les envío mi pedido desde el menú digital para confirmarlo. ¡Muchas gracias!`;

  const wspBase = whatsappDestino
    ? `https://api.whatsapp.com/send?phone=${whatsappDestino}&text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(wspBase, '_blank', 'noopener');

  vaciarCarrito();
  $('#cart-drawer').close();
  abrirModalFeedback(mesaSel, cliente, true);
};

// =================================================================== ENCUESTA, FEEDBACK Y GOOGLE MAPS
let feedbackState = { estrellas: 5, mesa: 'Mesa 1', cliente: '' };

function abrirModalFeedback(mesa = 'Mesa 1', cliente = '', vieneDePedido = false) {
  feedbackState.mesa = mesa || 'Mesa 1';
  feedbackState.cliente = cliente || '';
  const modal = $('#modal-feedback');
  if (!modal) return;

  const topPill = $('#fb-top-pill');
  if (topPill) topPill.textContent = vieneDePedido ? `${mesa} · La Central` : 'La Central · Tunja';

  const title = $('#fb-title');
  if (title) title.textContent = vieneDePedido ? I18N[lang].fbTitle : (lang === 'en' ? 'how was your visit?' : '¿cómo estuvo tu visita?');

  const sub = $('#fb-subtitle');
  if (sub) sub.textContent = vieneDePedido ? I18N[lang].fbSubtitle : (lang === 'en' ? 'Your review helps us keep brewing the best specialty coffee.' : 'Tu opinión nos ayuda a seguir preparando el mejor café de especialidad.');

  const flowHigh = $('#fb-flow-high');
  if (flowHigh) flowHigh.hidden = true;
  const flowLow = $('#fb-flow-low');
  if (flowLow) flowLow.hidden = true;
  const sentOk = $('#fb-sent-ok');
  if (sentOk) sentOk.hidden = true;
  const comm = $('#fb-comentario');
  if (comm) comm.value = '';

  actualizarEstrellas(0);
  const starText = $('#fb-star-text');
  if (starText) starText.textContent = I18N[lang].fbStarHint;

  modal.showModal();
}

function actualizarEstrellas(n) {
  $$('#fb-stars .fb-star').forEach(s => {
    const v = Number(s.dataset.val);
    s.classList.toggle('active', v <= n);
  });
}

function seleccionarEstrellas(n) {
  feedbackState.estrellas = n;
  actualizarEstrellas(n);

  const starText = $('#fb-star-text');
  const flowHigh = $('#fb-flow-high');
  const flowLow = $('#fb-flow-low');

  if (n >= 4) {
    if (starText) starText.textContent = n === 5 ? (lang === 'en' ? 'Excellent!' : '¡Excelente!') : (lang === 'en' ? 'Very Good!' : '¡Muy bueno!');
    if (flowHigh) flowHigh.hidden = false;
    if (flowLow) flowLow.hidden = true;
    enviarFeedbackSilencioso(n, '');
  } else {
    if (starText) starText.textContent = n === 1 ? (lang === 'en' ? 'Fair' : 'Regular') : `${n} ${lang === 'en' ? 'stars' : 'estrellas'}`;
    if (flowHigh) flowHigh.hidden = true;
    if (flowLow) flowLow.hidden = false;
  }
}

async function enviarFeedbackSilencioso(estrellas, comentario) {
  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estrellas,
        comentario,
        mesa: feedbackState.mesa,
        cliente: feedbackState.cliente
      })
    });
  } catch {}
  try {
    const list = JSON.parse(localStorage.getItem('lc_feedback') || '[]');
    list.push({ estrellas, comentario, mesa: feedbackState.mesa, cliente: feedbackState.cliente, fecha: new Date().toISOString() });
    localStorage.setItem('lc_feedback', JSON.stringify(list));
  } catch {}
}

$('#btn-fb-top-close')?.addEventListener('click', () => $('#modal-feedback')?.close());
$('#btn-fb-close')?.addEventListener('click', () => $('#modal-feedback')?.close());
$('#modal-feedback')?.addEventListener('click', e => { if (e.target === $('#modal-feedback')) $('#modal-feedback').close(); });

$$('#fb-stars .fb-star').forEach(b => {
  b.onclick = () => seleccionarEstrellas(Number(b.dataset.val));
});

$('#btn-open-review')?.addEventListener('click', () => abrirModalFeedback(mesaActual, '', false));
$('#btn-footer-review')?.addEventListener('click', () => abrirModalFeedback(mesaActual, '', false));

$('#btn-enviar-opinion')?.addEventListener('click', async () => {
  const comm = $('#fb-comentario')?.value?.trim() || '';
  await enviarFeedbackSilencioso(feedbackState.estrellas, comm);
  const sentOk = $('#fb-sent-ok');
  if (sentOk) sentOk.hidden = false;
  setTimeout(() => $('#modal-feedback')?.close(), 1600);
});


// =================================================================== RENDERIZADO CARTA
const tabs = $('#tabs'), carta = $('#carta');
const byId = {};
let targets = [];

const btn3d = it => it.model
  ? `<button type="button" class="ring b3d" data-id="${esc(it.id)}" aria-label="Ver ${esc(it.nombre)} en 3D">3D</button>`
  : '<span class="ring b3d vacio" aria-hidden="true"></span>';

// precio 0 = producto nuevo sin precio aún (se fija desde la caja): se muestra "por confirmar" y no se puede pedir
const sinPrecio = it => !(it.precio > 0);
const precioTxt = it => sinPrecio(it) ? I18N[lang].porConfirmar : fmt(it.precio);
const fila = (it, extra = '') =>
  `<div class="fila${it.agotado ? ' agotado' : ''}${sinPrecio(it) ? ' sin-precio' : ''}"><span class="nom">${esc(it.nombre)}</span><span class="dots" aria-hidden="true"></span><span class="pre">${it.agotado ? I18N[lang].agotado : precioTxt(it)}</span>${extra}</div>`;

function tab(id, texto) { const a = el('a', 'tab'); a.textContent = texto; a.href = '#' + id; a.dataset.cat = id; tabs.append(a); }

function renderCarta() {
  const t = I18N[lang];
  tabs.innerHTML = '';
  carta.innerHTML = '';
  for (const k of Object.keys(byId)) delete byId[k];
  // de día se ocultan las categorías de la parrilla; en la parrilla va todo, con lo de noche primero
  const noche = document.documentElement.dataset.modo === 'parrilla';
  const esNoche = sec => sec.bloques.some(b => b.horario === 'noche');
  const secciones = noche ? [...MENU].sort((a, b) => esNoche(b) - esNoche(a)) : MENU;
  for (const sec of secciones) {
    const bloques = sec.bloques.filter(b => noche || b.horario !== 'noche');
    if (!bloques.length) continue;
    const s = el('section', 'cat'); s.id = sec.id;
    const h2 = el('h2', 'cat-t'); h2.textContent = sec.titulo;
    s.append(h2, el('hr', 'regla'));
    if (bloques[0]?.tipo === 'destacado') tab(sec.id, sec.titulo);

    let dests = null, listas = null;
    for (const b of bloques) {
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
            ${foto}${it.agotado ? `<span class="sello">${esc(t.agotadoHoy)}</span>` : ''}${it.model ? '</button>' : '</div>'}
            <div class="dest-body${it.agotado ? ' agotado' : ''}">
              <h3 class="dest-nom">${esc(it.nombre)}</h3>
              <div class="precios2${it.combo ? '' : ' uno'}">
                <div><small>${esc(it.combo ? t.sencillo : t.precio)}</small><b>${esc(it.agotado ? t.agotado : precioTxt(it))}</b></div>
                ${it.combo ? `<div><small>${esc(t.combo)}</small><b>${esc(it.agotado || it.comboAgotado ? t.agotado : fmt(it.combo))}</b><span>${it.comboIncluye.map(esc).join('<br>')}</span></div>` : ''}
              </div>
              ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ''}
              ${!it.agotado && !sinPrecio(it) ? `
              <div class="dest-actions">
                <button type="button" class="btn-pedir" data-add="${esc(it.id)}" data-var="sencillo">${esc(t.pedir)}</button>
                ${it.combo && !it.comboAgotado ? `<button type="button" class="btn-pedir btn-pedir-combo" data-add="${esc(it.id)}" data-var="combo">${esc(t.pedirCombo)}</button>` : ''}
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
          li.innerHTML = fila(it) + (it.agotado || sinPrecio(it) ? '' : `<button type="button" class="btn-add-item" data-add="${esc(it.id)}" data-var="sencillo" title="Agregar">${esc(t.pedir)}</button>`) + (noche && sec.id !== 'bebidas' ? btn3d(it) : '');   // 3D solo de noche y no en bebidas
          ul.append(li);
        }
        blk.append(ul);
        listas ??= s.appendChild(el('div', 'listas'));
        listas.append(blk);
      }
    }
    carta.append(s);
  }
  document.querySelectorAll('[data-svg]').forEach(async e => { e.innerHTML = await svg(e.dataset.svg); });
  targets = [...tabs.querySelectorAll('.tab')].map(tb => document.getElementById(tb.dataset.cat)).filter(Boolean);
  if ($('#menu-search')?.value) filtrarCarta($('#menu-search').value);
  marcar();
}

// cuando cambia el modo en vivo (p. ej. a las 4 pm del jueves) la carta se vuelve a armar
new MutationObserver(() => {
  if (carta.children.length) renderCarta();
  const t = I18N[lang];
  $('#menu-search').placeholder = document.documentElement.dataset.modo === 'parrilla' ? t.searchPlaceholder : t.searchPlaceholderDia;
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });

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
  $('#v-bar').style.width = '0%';
  $('#v-bar').parentElement.classList.remove('done');
  mv.poster = poster(it.model);
  mv.src = model(it.model);
  mv.alt = `Modelo 3D de ${it.nombre}`;
  $('#v-nombre').textContent = it.nombre;
  $('#v-desc').textContent = it.desc || '';
  $('#v-precio').innerHTML = it.combo
    ? `<span><small>${I18N[lang].sencillo}</small>${precioTxt(it)}</span><span><small>${I18N[lang].combo}</small>${fmt(it.combo)}<em>${it.comboIncluye.map(esc).join(' · ')}</em></span>`
    : `<span>${precioTxt(it)}</span>`;
  
  const pWrap = $('#v-pedir-wrap');
  if (pWrap) {
    const t = I18N[lang];
    pWrap.innerHTML = !it.agotado && !sinPrecio(it) ? `
      <button type="button" class="btn-pedir" id="v-add-sencillo">${esc(t.pedir)} ${esc(it.nombre)}</button>
      ${it.combo && !it.comboAgotado ? `<button type="button" class="btn-pedir btn-pedir-combo" id="v-add-combo">${esc(t.pedirCombo)}</button>` : ''}
    ` : `<span class="sello">${esc(t.agotado)}</span>`;
    
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

function reconciliarCarrito() {
  if (!cart.length) return;
  const limpio = [];
  for (const c of cart) {
    const it = byId[c.id];
    if (!it || it.agotado || sinPrecio(it)) continue;
    if (c.variante === 'combo' && (!it.combo || it.comboAgotado)) continue;
    const cant = Math.max(1, Math.min(99, parseInt(c.cantidad, 10) || 1));
    limpio.push({
      id: it.id,
      nombre: it.nombre,
      variante: c.variante === 'combo' ? 'combo' : 'sencillo',
      precio: c.variante === 'combo' ? it.combo : it.precio,
      cantidad: cant
    });
  }
  if (JSON.stringify(limpio) !== JSON.stringify(cart)) {
    cart = limpio;
    localStorage.setItem('lc_cliente_cart', JSON.stringify(cart));
  }
}

// Inicializar carta, idioma y carrito
renderCarta();
reconciliarCarrito();
aplicarIdioma();
actualizarUICarrito();

// Service Worker
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- modo parrilla: los títulos entran "enfocándose" (de desenfocado a nítido) ----------
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('enfocado'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  const observar = () => document.querySelectorAll('.cat-t:not(.enfocar)').forEach(t => { t.classList.add('enfocar'); io.observe(t); });
  observar();
  new MutationObserver(observar).observe(document.getElementById('carta') || document.body, { childList: true, subtree: true });
})();

// "reducir movimiento": quitar ondas de calor de la palabra de la portada (las animaciones SVG no leen la media query)
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('#derrite animate[repeatCount="indefinite"]').forEach(a => a.remove());
}
