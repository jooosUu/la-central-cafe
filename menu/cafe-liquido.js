// Café líquido en tiempo real (WebGL) para la portada de día: el espejo del fuego de la noche.
// El fuego sube desde abajo; el café gotea desde arriba: chorros que cuelgan, se estiran y sueltan gotas que caen.
// Tonos de espresso a crema, con transparencia para que la taza y "café" se sigan leyendo encima.
// Se dibuja en <canvas class="cafe-liquido">; solo de día; se pausa fuera de pantalla y con la pestaña oculta.
(() => {
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const FRAG = `
    precision highp float;
    uniform vec2 r; uniform float t; uniform float alto;
    float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
    // unión suave: las gotas se funden con el chorro como líquido de verdad
    float smin(float a, float b, float k){ float m = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, m) - k * m * (1. - m); }
    float capsula(vec2 p, vec2 a, vec2 b, float ra){ vec2 pa = p - a, ba = b - a; float q = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * q) - ra; }
    void main(){
      float asp = r.x / r.y;
      vec2 p = vec2(gl_FragCoord.x / r.y, 1. - gl_FragCoord.y / r.y);   // y: 0 arriba, 1 abajo (en altos de pantalla)
      // franja de café arriba, con borde ondulado
      float borde = .045 + .012 * sin(p.x * 9. + t * .6) + .008 * sin(p.x * 23. - t * .9);
      float d = p.y - borde;
      const int N = 16;
      for (int i = 0; i < N; i++) {
        float fi = float(i);
        float x = (fi + .5 + (h(fi) - .5) * .6) / float(N) * asp;
        float vel = .16 + .14 * h(fi + 3.1);                 // cada chorro a su ritmo
        float c = fract(t * vel + h(fi + 7.7));
        float grueso = .010 + .007 * h(fi + 1.3);
        // 1) el chorro cuelga y se va estirando
        float largo = (.03 + .09 * h(fi + 5.2)) * smoothstep(0., .55, c) * (1. - smoothstep(.55, .62, c));
        d = smin(d, capsula(p, vec2(x, borde - .01), vec2(x, borde + largo), grueso * (1. - .35 * smoothstep(0., .55, c))), .025);
        // 2) se suelta la gota y cae acelerando (con forma de lágrima)
        float caida = max(c - .55, 0.);
        float yg = borde + (.03 + .09 * h(fi + 5.2)) + caida * caida * 9. * alto;
        float rg = grueso * 1.45;
        vec2 q = p - vec2(x, yg);
        q.y *= mix(1., .72, smoothstep(.0, .2, caida));     // se alarga al caer
        float gota = length(q) - rg;
        gota = smin(gota, capsula(p, vec2(x, yg - rg * 2.2), vec2(x, yg), rg * .25), .012);   // colita de la lágrima
        d = c > .55 ? smin(d, gota, .02) : d;
      }
      float a = smoothstep(.003, -.003, d);
      // espresso por dentro, crema en el borde y un brillo pequeño arriba a la izquierda de cada gota
      vec3 espresso = vec3(.16, .09, .05), crema = vec3(.55, .36, .22);
      vec3 col = mix(crema, espresso, smoothstep(0., -.012, d));
      float brillo = smoothstep(-.004, -.010, d) * smoothstep(-.016, -.010, d) * step(.5, fract(gl_FragCoord.x / r.y * 0. + .7));
      col += vec3(.25, .2, .15) * brillo * .35;
      gl_FragColor = vec4(col * a, a);
    }`;

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function iniciar(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) return;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uA = gl.getUniformLocation(prog, 'alto');
    const alto = parseFloat(canvas.dataset.alto || '0.6');

    const ESCALA = 0.75;   // gotas con borde limpio (aún por debajo de la resolución de pantalla)
    const medir = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * ESCALA)), hh = Math.max(1, Math.round(canvas.clientHeight * ESCALA));
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; gl.viewport(0, 0, w, hh); }
    };
    let visible = false, raf = 0;
    const t0 = performance.now() - Math.random() * 10000;
    const dia = () => document.documentElement.dataset.modo !== 'parrilla';
    const cuadro = now => {
      medir();
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform1f(uA, alto);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = (visible && dia() && !reducir && !document.hidden) ? requestAnimationFrame(cuadro) : 0;
    };
    const arrancar = () => { if (!raf && dia()) raf = requestAnimationFrame(cuadro); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) arrancar(); });
    new MutationObserver(arrancar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });
    addEventListener('resize', arrancar);
    arrancar();
  }

  document.querySelectorAll('canvas.cafe-liquido').forEach(iniciar);
})();
