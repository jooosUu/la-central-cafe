// Portada de día: la palabra "café" formada por granos de café tostados (arábica, robusta y libérica).
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

  // granos de café dibujados con luz y sombra (originales, no fotos): tres tipos como los de verdad.
  // arábica: ovalado con la ranura en S · robusta: redondo con la ranura recta · libérica: largo y angosto.
  let sprites = [], S = 0;
  const TIPOS = [
    { rx: .60, ry: .86, curva: .30, tono: ['#A0522D', '#6E3219', '#3A170A'] },
    { rx: .64, ry: .74, curva: .08, tono: ['#94512F', '#64301B', '#35170C'] },
    { rx: .50, ry: .96, curva: .20, tono: ['#A85A33', '#73361C', '#3E190B'] },
  ];
  function hacerSprite(tam) {
    S = tam;
    const TUESTES = [   // de claro a casi negro (multiplica el tono base)
      { f: 1.25, brillo: .30 }, { f: 1, brillo: .35 }, { f: .78, brillo: .4 }, { f: .58, brillo: .45 } ];
    const variantes = [];
    for (const tp of TIPOS) for (const tu of TUESTES) for (const lado of [1, -1]) variantes.push({ tp, tu, lado });
    sprites = variantes.map(({ tp, tu, lado }) => {
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(tam * 2 * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(tam, tam);
      const rx = tam * tp.rx, ry = tam * tp.ry;
      // cuerpo tostado: luz arriba a la izquierda, borde oscuro
      const grad = g.createRadialGradient(-rx * .35, -ry * .4, tam * .1, 0, 0, Math.max(rx, ry) * 1.05);
      const tono = c => { const n = parseInt(c.slice(1), 16), m = v => Math.min(255, Math.round(v * tu.f));
        return `rgb(${m(n >> 16)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`; };
      grad.addColorStop(0, tono(tp.tono[0])); grad.addColorStop(.6, tono(tp.tono[1])); grad.addColorStop(1, tono(tp.tono[2]));
      g.fillStyle = grad;
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
      // ranura: surco oscuro con la piel plateada clara adentro
      const k = tp.curva * lado * (.7 + Math.random() * .6);
      const ranura = () => { g.beginPath(); g.moveTo(0, -ry * .8);
        g.bezierCurveTo(rx * k * 2.2, -ry * .25, -rx * k * 2.2, ry * .25, 0, ry * .8); g.stroke(); };
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(30, 12, 5, .85)'; g.lineWidth = Math.max(1.2, tam * .2); ranura();
      g.strokeStyle = '#E9D5A8'; g.lineWidth = Math.max(.7, tam * .07); ranura();
      // brillo suave de la superficie aceitosa
      const b = g.createRadialGradient(-rx * .4, -ry * .45, 0, -rx * .4, -ry * .45, rx * .7);
      b.addColorStop(0, `rgba(255, 230, 200, ${tu.brillo})`); b.addColorStop(1, 'rgba(255, 230, 200, 0)');
      g.fillStyle = b;
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
      return c;
    });
  }

  function armar() {
    const estilo = getComputedStyle(texto);
    const r = texto.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    const fs = parseFloat(estilo.fontSize), pad = Math.round(fs * 0.15);   // margen a los dos lados: la "m" y la tilde se salen de la caja del texto
    W = Math.max(1, Math.round(r.width + pad * 2)); H = Math.max(1, Math.round(r.height * 1.5));
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.left = (texto.offsetLeft - pad) + 'px';
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
    if ('letterSpacing' in o) o.letterSpacing = estilo.letterSpacing;   // mismo apretado de letras que el texto real
    const m = o.measureText(texto.textContent);
    const base = (H + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    o.textAlign = 'center';
    o.fillText(texto.textContent, W / 2, base);
    const datos = o.getImageData(0, 0, W, H).data;

    const tam = Math.max(4, Math.round(parseFloat(estilo.fontSize) / 21));   // granos más chicos: los trazos finos (la f) se leen   // tamaño del grano según la letra
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
            vx: 0, vy: 0, a: Math.random() * Math.PI, va: 0, tipo: v ? v.tipo : Math.floor(Math.random() * 24), esc: v ? v.esc : .78 + Math.random() * .42,
            ha: (Math.random() - .5) * Math.PI * 1.6,   // cada grano mirando hacia su lado
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
      const e = half * g.esc;   // tamaños distintos, como en un costal de verdad
      ctx.drawImage(sprites[g.tipo], -e, -e, e * 2, e * 2);
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
