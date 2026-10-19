// Service worker del menú: abre rápido y sin señal. Precios siempre frescos cuando hay red.
const VERSION = 'lacentral-menu-v13';
const BASE = ['./', 'index.html', 'styles.css?v=13', 'app.js?v=13', 'menu.js?v=13', 'vendor/model-viewer.min.js',
  'fonts/Utendo-Medium.ttf', 'fonts/Utendo-ExtraBold.ttf', 'fonts/Geist-VariableFont_wght.ttf',
  'img/logo-horizontal.svg', 'img/taza.svg', 'img/icono-corazon.svg', 'img/icono-fuego.svg', 'img/icono-rapido.svg', 'img/icono-cafe.svg'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/caja')) return;
  if (url.pathname.startsWith('/api/') || e.request.mode === 'navigate') {
    // red primero (precios y agotados al día); si no hay red, lo último guardado
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
    return;
  }
  // archivos (fotos, modelos 3D, fuentes): caché primero
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then(k => k.put(e.request, c)); }
    return r;
  })));
});
