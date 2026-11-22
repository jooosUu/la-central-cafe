// Video de fondo de noche: la parrilla de verdad, fija detrás de toda la carta (oscurecida por CSS).
// Se descarga después de que la página cargó, solo de noche, sin "ahorro de datos" ni "reducir movimiento".
// Mientras carga (o si no se puede) se ve la foto fija del primer cuadro. Celular: vertical; computador: horizontal.
(() => {
  const caja = document.querySelector('.fondo-video');
  const vid = caja?.querySelector('video');
  if (!vid) return;
  vid.muted = true;

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ahorro = navigator.connection?.saveData === true;
  const noche = () => document.documentElement.dataset.modo === 'parrilla';
  const tipo = () => (innerWidth / innerHeight > 1 ? 'pc' : 'movil');
  let cargado = '', listo = document.readyState === 'complete';

  function preparar() {
    const t = tipo();
    caja.style.backgroundImage = `url(video/fondo-${t}.jpg?v=1)`;
    if (reducir || ahorro || !listo || cargado === t) return;
    cargado = t;
    vid.classList.remove('andando');
    vid.innerHTML = `<source src="video/fondo-${t}.webm?v=1" type="video/webm"><source src="video/fondo-${t}.mp4?v=1" type="video/mp4">`;
    vid.load();
  }
  function actualizar() {
    if (!noche()) { vid.pause(); return; }
    preparar();
    if (!document.hidden && cargado) vid.play().catch(() => {});
    else vid.pause();
  }
  vid.addEventListener('playing', () => vid.classList.add('andando'));
  if (!listo) addEventListener('load', () => { listo = true; actualizar(); }, { once: true });
  document.addEventListener('visibilitychange', actualizar);
  new MutationObserver(actualizar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (noche() && cargado && cargado !== tipo()) { cargado = ''; actualizar(); } }, 400); });
  actualizar();
})();
