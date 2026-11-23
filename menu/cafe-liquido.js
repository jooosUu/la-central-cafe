// Granos de café cayendo suave (Canvas 2D) para la portada de día:
// granos gráficos en blanco y negro con su hendidura central característica,
// cayendo despacio desde arriba (espejo limpio del fuego de noche).
(() => {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function iniciar(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const N = 24;
    const granos = Array.from({ length: N }, (_, i) => {
      // Distribuir más por los lados para dejar respirar el título central, sin dejar huecos
      const lado = i % 3 === 0 ? Math.random() : (i % 2 === 0 ? Math.random() * 0.36 : 0.64 + Math.random() * 0.36);
      return {
        x: lado,
        y: Math.random(),
        rx: 5.5 + Math.random() * 5.5,
        ry: 3.8 + Math.random() * 3.6,
        v: 0.04 + Math.random() * 0.055,
        deriva: (Math.random() - 0.5) * 0.01,
        fase: i * 1.41,
        a: 0.14 + Math.random() * 0.18,
        solido: i % 3 !== 0, // mezcla de granos sólidos y contorneados
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.55,
      };
    });

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

    const dibujarGrano = (g, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, g.rx, g.ry, 0, 0, Math.PI * 2);

      if (g.solido) {
        ctx.fillStyle = '#111111';
        ctx.fill();
        // Hendidura central en S típica del grano de café tostado
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1.2, g.ry * 0.24);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-g.rx * 0.72, 0);
        ctx.bezierCurveTo(-g.rx * 0.22, -g.ry * 0.42, g.rx * 0.22, g.ry * 0.42, g.rx * 0.72, 0);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-g.rx * 0.68, 0);
        ctx.bezierCurveTo(-g.rx * 0.2, -g.ry * 0.38, g.rx * 0.2, g.ry * 0.38, g.rx * 0.68, 0);
        ctx.stroke();
      }
      ctx.restore();
    };

    const pintar = now => {
      const dt = Math.min(0.05, Math.max(0, (now - ultimo) / 1000));
      ultimo = now;
      medir();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const g of granos) {
        if (!reducir) {
          g.y += g.v * dt;
          g.x += (g.deriva + Math.sin(now * 0.0008 + g.fase) * 0.006) * dt;
          g.rot += g.vrot * dt;
          if (g.y > 1.08) { g.y = -0.08; g.x = Math.random(); }
          if (g.x < -0.04) g.x = 1.04;
          if (g.x > 1.04) g.x = -0.04;
        }
        const px = g.x * w, py = g.y * h;
        const fade = Math.min(1, g.y / 0.14) * Math.min(1, (1 - g.y) / 0.24);
        const alpha = Math.max(0, g.a * fade);
        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(g.rot);
        dibujarGrano(g, alpha);
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
