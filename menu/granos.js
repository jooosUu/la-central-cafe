// Portada de día: la palabra "menú" formada por granos de café (negro sobre blanco, estética B/N de la marca).
// Al cargar, los granos caen y se acomodan; al pasar el dedo o el mouse se apartan y vuelven a su sitio
// con un resorte amortiguado (sin rebotes). Solo corre en modo café; en la parrilla se apaga.
(() => {
  const texto = document.getElementById('txt-intro-t');
  if (!texto) return;
  const cv = document.createElement('canvas');
  cv.className = 'granos';
  cv.setAttribute('aria-hidden', 'true');
  texto.after(cv);

  const ctx = cv.getContext('2d');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let granos = [], raf = 0, W = 0, H = 0, dpr = 1, puntero = null, visible = true, ultimoTexto = '';

  // grano de café: óvalo con la ranura en S (se dibuja una vez y se reutiliza rotado)
  let sprite = null, S = 0;
  function hacerSprite(tam) {
    S = tam;
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = Math.ceil(tam * 2 * dpr);
    const g = sprite.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(tam, tam);
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(0, 0, tam * 0.62, tam * 0.86, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, tam * 0.13); g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -tam * 0.66);
    g.bezierCurveTo(tam * 0.26, -tam * 0.22, -tam * 0.26, tam * 0.22, 0, tam * 0.66);
    g.stroke();
  }

  function armar() {
    const estilo = getComputedStyle(texto);
    const r = texto.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width + parseFloat(estilo.fontSize) * 0.3)); H = Math.max(1, Math.round(r.height * 1.5));   // margen: la tilde y la última letra se salen de la caja del texto
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.left = texto.offsetLeft + 'px';
    cv.style.top = (texto.offsetTop - (H - r.height) / 2) + 'px';
    document.documentElement.classList.add('granos-on');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // dibujar la palabra en un lienzo oculto y muestrear sus píxeles
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#000';
    o.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
    o.textBaseline = 'alphabetic';
    const m = o.measureText(texto.textContent);
    const base = (H + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    o.fillText(texto.textContent, -parseFloat(estilo.fontSize) * 0.04, base);
    const datos = o.getImageData(0, 0, W, H).data;

    const tam = Math.max(5, Math.round(parseFloat(estilo.fontSize) / 17));   // tamaño del grano según la letra
    hacerSprite(tam);
    const paso = tam * 1.18;
    const viejos = granos;
    granos = [];
    for (let y = paso / 2; y < H; y += paso) {
      for (let x = paso / 2; x < W; x += paso * 0.86) {
        const xx = x + (Math.round(y / paso) % 2 ? paso * 0.43 : 0);
        if (xx >= W) continue;
        if (datos[(Math.round(y) * W + Math.round(xx)) * 4 + 3] > 140) {
          const v = viejos[granos.length];
          granos.push({
            hx: xx + (Math.random() - .5) * tam * .25, hy: y + (Math.random() - .5) * tam * .25,
            // entran dispersos alrededor de su sitio y se juntan (sin pasar por encima de la cabecera)
            x: v ? v.x : xx + (Math.random() - .5) * W * .35,
            y: v ? v.y : y + (Math.random() - .5) * H * .9,
            vx: 0, vy: 0, a: Math.random() * Math.PI, va: 0,
            ha: (Math.random() - .5) * 1.2,
          });
        }
      }
    }
    if (reducir) granos.forEach(g => { g.x = g.hx; g.y = g.hy; g.a = g.ha; });
    ultimoTexto = texto.textContent;
  }

  function dibujar() {
    ctx.clearRect(0, 0, W, H);
    const half = S;
    for (const g of granos) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.a);
      ctx.drawImage(sprite, -half, -half, half * 2, half * 2);
      ctx.restore();
    }
  }

  // resorte críticamente amortiguado: vuelve a su sitio sin pasarse (nada de rebotes)
  const K = 0.045, AMORT = 2 * Math.sqrt(K);
  function fisica() {
    let quieto = true;
    const R = Math.max(60, S * 9), R2 = R * R;
    for (const g of granos) {
      let ax = (g.hx - g.x) * K - g.vx * AMORT;
      let ay = (g.hy - g.y) * K - g.vy * AMORT;
      if (puntero) {
        const dx = g.x - puntero.x, dy = g.y - puntero.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * 2.6;
          ax += (dx / d) * f; ay += (dy / d) * f;
          g.va += (dx > 0 ? 1 : -1) * f * 0.004;
        }
      }
      g.vx += ax; g.vy += ay; g.x += g.vx; g.y += g.vy;
      g.va += (g.ha - g.a) * 0.03 - g.va * 0.2; g.a += g.va;
      if (Math.abs(g.vx) + Math.abs(g.vy) > 0.02 || Math.abs(g.hx - g.x) + Math.abs(g.hy - g.y) > 0.3) quieto = false;
    }
    return quieto;
  }
  // el paso de física va a ritmo fijo (60 por segundo) aunque el dispositivo dibuje menos cuadros:
  // en un celular lento los granos llegan a su sitio en el mismo tiempo
  let ultimo = 0;
  function paso(ahora) {
    const n = ultimo ? Math.min(8, Math.max(1, Math.round((ahora - ultimo) / 16.7))) : 1;
    ultimo = ahora;
    let quieto = true;
    for (let i = 0; i < n; i++) quieto = fisica();
    dibujar();
    raf = (!quieto || puntero) && visible && !document.hidden ? requestAnimationFrame(paso) : 0;
    if (!raf) ultimo = 0;
  }
  const mover = () => { if (!raf && !reducir) raf = requestAnimationFrame(paso); };

  function enPunto(e) {
    const r = cv.getBoundingClientRect();
    puntero = { x: e.clientX - r.left, y: e.clientY - r.top };
    mover();
  }
  cv.addEventListener('pointermove', enPunto);
  cv.addEventListener('pointerdown', enPunto);
  cv.addEventListener('pointerleave', () => { puntero = null; mover(); });
  cv.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { puntero = null; mover(); } });

  const activo = () => document.documentElement.dataset.modo !== 'parrilla';
  function iniciar() {
    if (!activo()) { cancelAnimationFrame(raf); raf = 0; return; }
    armar();
    if (reducir) dibujar(); else mover();
  }

  // esperar la fuente de la marca para muestrear la palabra con la forma correcta
  (document.fonts?.ready || Promise.resolve()).then(() => {
    iniciar();
    new ResizeObserver(() => { if (activo()) { armar(); dibujar(); mover(); } }).observe(texto);
    new MutationObserver(() => { if (texto.textContent !== ultimoTexto && activo()) { armar(); mover(); } })
      .observe(texto, { childList: true, characterData: true, subtree: true });
    new MutationObserver(iniciar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) mover(); }).observe(cv);
  });
})();
