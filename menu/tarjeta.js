// Tarjeta de sellos del cliente. El código de la tarjeta queda guardado en el celular (localStorage);
// los sellos los pone la caja al cobrar, aquí solo se muestran.
(() => {
  const $ = s => document.querySelector(s);
  const CLAVE = 'lacentral-tarjeta', VISTOS = 'lacentral-tarjeta-vistos';

  fetch('img/logo-horizontal.svg?v=3').then(r => r.text()).then(s => { $('#logo').innerHTML = s; $('#foot-logo').innerHTML = s; });

  // grano de café (mismo dibujo que los granos de la portada) — lleno o vacío
  const grano = lleno => `<svg viewBox="-20 -24 40 48" aria-hidden="true">
    <ellipse rx="13" ry="18" class="${lleno ? 'g-lleno' : 'g-vacio'}"/>
    ${lleno ? '<path d="M0-14C5.5-4.6-5.5 4.6 0 14" class="g-ranura"/>' : ''}</svg>`;

  function pintar(t) {
    const enTarjeta = t.premio ? t.meta : t.sellos % t.meta;
    const vistos = Number(localStorage.getItem(VISTOS + t.token) ?? enTarjeta);
    $('#tj-nombre').textContent = t.nombre;
    $('#tj-tel').textContent = t.telefono;
    $('#tj-desc').textContent = `${t.descuento}% de descuento`;
    $('#tj-sellos').innerHTML = Array.from({ length: t.meta }, (_, i) => {
      const lleno = i < enTarjeta, nuevo = lleno && i >= vistos;
      return `<li class="${lleno ? 'on' : ''}${nuevo ? ' nuevo' : ''}" style="--i:${i}" aria-label="sello ${i + 1}${lleno ? ', puesto' : ''}">
        ${grano(lleno)}<span class="tj-llama"></span><span class="tj-n">${i + 1}</span></li>`;
    }).join('');
    const faltan = t.meta - enTarjeta;
    $('#tj-estado').textContent = t.premio ? `${t.meta} de ${t.meta} · tarjeta completa`
      : enTarjeta === 0 ? `0 de ${t.meta} · tu primer sello llega con tu próxima compra`
      : `${enTarjeta} de ${t.meta} · ${faltan === 1 ? 'te falta 1 compra' : `te faltan ${faltan} compras`} para tu premio`;
    $('#tj-premio').hidden = !t.premio;
    $('#tj-card').classList.toggle('completa', !!t.premio);
    const nombres = { sello: 'sello', canje: 'premio canjeado' };
    $('#tj-hist').innerHTML = t.historial.map(h =>
      `<li><span>${h.fecha.slice(0, 10).split('-').reverse().join('/')}</span><span>${nombres[h.tipo]}</span><span>${h.cantidad > 0 ? '+' : ''}${h.cantidad}</span></li>`).join('');
    $('#tj-form').hidden = true;
    $('#tj-card').hidden = false;
    $('#tj-acciones').hidden = false;
    localStorage.setItem(VISTOS + t.token, enTarjeta);
  }

  async function cargar(token) {
    try {
      const r = await fetch('/api/tarjeta/' + token);
      if (r.status === 404) { localStorage.removeItem(CLAVE); return mostrarForm(); }
      if (!r.ok) throw new Error();
      pintar(await r.json());
    } catch { $('#tj-estado').textContent = 'sin conexión: tus sellos se ven cuando vuelva la señal'; $('#tj-card').hidden = false; $('#tj-acciones').hidden = false; }
  }

  function mostrarForm() {
    $('#tj-form').hidden = false; $('#tj-card').hidden = true; $('#tj-acciones').hidden = true;
  }

  $('#tj-form').addEventListener('input', () => { $('#tj-error').textContent = ''; });
  $('#tj-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nombre = String(f.get('nombre')).trim(), telefono = String(f.get('telefono')).replace(/\D/g, '');
    if (!nombre) return ($('#tj-error').textContent = 'Escribe tu nombre.');
    if (telefono.length < 7) return ($('#tj-error').textContent = 'Escribe tu número de celular.');
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      const r = await fetch('/api/tarjeta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, telefono }) });
      const t = await r.json();
      if (!r.ok) throw new Error(t.error);
      localStorage.setItem(CLAVE, t.token);
      pintar(t);
    } catch (err) { $('#tj-error').textContent = err.message || 'No se pudo crear la tarjeta. Intenta de nuevo.'; }
    finally { btn.disabled = false; }
  });
  $('#tj-salir').addEventListener('click', () => {
    const t = localStorage.getItem(CLAVE);
    if (t) localStorage.removeItem(VISTOS + t);
    localStorage.removeItem(CLAVE);
    mostrarForm();
  });

  // iPhone (Safari, no instalada): explicar cómo dejarla en la pantalla de inicio
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone;
  $('#tj-ios').hidden = !ios;

  const token = localStorage.getItem(CLAVE);
  if (token) cargar(token); else mostrarForm();
  // al volver a la app (después de pagar) se actualizan los sellos
  document.addEventListener('visibilitychange', () => { const t = localStorage.getItem(CLAVE); if (!document.hidden && t) cargar(t); });
})();
