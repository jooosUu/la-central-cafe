// Lluvia fina de molienda de café (Canvas 2D) para la portada de día:
// granos/partículas mínimas en blanco y negro que descienden suave desde arriba,
// como café recién molido cayendo al filtro (espejo limpio del fuego de noche).
(() => {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function iniciar(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const N = 42;
    const particulas = Array.from({ length: N }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.9 + Math.random() * 1.9,
      v: 0.035 + Math.random() * 0.055,
      deriva: (Math.random() - 0.5) * 0.012,
      fase: i * 1.37,
      a: 0.10 + Math.random() * 0.22,
      forma: Math.random() > 0.45 ? 1 : 0, // 1 = mini-grano ovalado, 0 = mota redonda
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.4,
    }));

    let w = 0, h = 0, dpr = 1;
    const medir = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
      if (w !== cw || h !== ch) {
        w = cw; h = ch;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
    };

    let visible = false, raf = 0, ultimo = performance.now();
    const dia = () => document.documentElement.dataset.modo !== 'parrilla';

    const pintar = now => {
      const dt = Math.min(0.05, Math.max(0, (now - ultimo) / 1000));
      ultimo = now;
      medir();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of particulas) {
        if (!reducir) {
          p.y += p.v * dt;
          p.x += (p.deriva + Math.sin(now * 0.0008 + p.fase) * 0.006) * dt;
          p.rot += p.vrot * dt;
          if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
          if (p.x < -0.02) p.x = 1.02;
          if (p.x > 1.02) p.x = -0.02;
        }
        const px = p.x * w, py = p.y * h;
        // desvanecer arriba y abajo para entrada/salida limpia
        const fade = Math.min(1, p.y / 0.12) * Math.min(1, (1 - p.y) / 0.22);
        const alpha = Math.max(0, p.a * fade);
        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(17, 17, 17, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        if (p.forma) ctx.ellipse(0, 0, p.r * 1.35, p.r * 0.88, 0, 0, Math.PI * 2);
        else ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = (visible && dia() && !reducir && !document.hidden) ? requestAnimationFrame(cuadro) : 0;
    };
    const cuadro = now => pintar(now);
    const arrancar = () => {
      if (!dia()) return;
      if (reducir) { pintar(performance.now()); return; }
      if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); }
    };

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) arrancar(); });
    new MutationObserver(arrancar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });
    addEventListener('resize', arrancar);
    arrancar();
  }

  document.querySelectorAll('canvas.cafe-liquido').forEach(iniciar);
})();
