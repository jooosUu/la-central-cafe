// Fuego en tiempo real (WebGL) para el modo parrilla: llamas generadas con ruido que sube,
// coloreadas de brasa → rojo La Central → naranja → amarillo. Original, sin video.
// Se dibuja en todo <canvas class="fuego"> visible. Se pausa fuera de pantalla y con la pestaña oculta.
(() => {
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
  const FRAG = `
    precision mediump float;
    uniform vec2 r; uniform float t; uniform float alto;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*n(p); p = p*2.03 + 7.1; a *= .5; } return v; }
    void main(){
      vec2 uv = gl_FragCoord.xy / r;
      float asp = r.x / r.y;
      vec2 p = vec2((uv.x - .5) * asp, uv.y);
      // ruido que sube y se deforma (lenguas de fuego)
      // estirado en vertical (más frecuencia en x) para que salgan lenguas separadas
      vec2 q = vec2(p.x * 3.4, p.y * 1.15 - t * 1.35);
      float w = fbm(q * 1.4 + vec2(0., -t * .6));
      float f = fbm(q + vec2(w * 1.8, w * .5));
      // más fuego abajo, se apaga hacia arriba; 'alto' controla hasta dónde llega
      float y = uv.y / alto;
      // contraste alto: donde el ruido es bajo queda negro (huecos entre lenguas)
      float fuego = (f - .36) * 2.6 - y * 1.15 + .12 * (1. - y);
      fuego += .10 * fbm(vec2(p.x * 9., t * 3.)) * (1. - y);   // parpadeo fino
      fuego += .32 * pow(max(1. - y * 1.6, 0.), 3.);            // brasa constante en la base
      float k = clamp(fuego * 1.25, 0., 1.);
      // FUEGO DESENFOCADO: los colores se funden entre sí (sin puntitos ni escalones), como visto a través del calor.
      vec3 c = vec3(.047, .039, .035);                              // negro #0C0A09
      c = mix(c, vec3(.36, .06, .03), smoothstep(.04, .30, k));    // brasa
      c = mix(c, vec3(.89, .25, .12), smoothstep(.24, .52, k));    // rojo La Central #E4411F
      c = mix(c, vec3(1., .56, .16), smoothstep(.50, .78, k));     // naranja
      c = mix(c, vec3(.98, .90, .74), smoothstep(.78, 1., k));     // centro claro
      gl_FragColor = vec4(c, 1.);
    }`;

  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function iniciar(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { canvas.classList.add('sin-webgl'); return; }
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add('sin-webgl'); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uA = gl.getUniformLocation(prog, 'alto');
    const alto = parseFloat(canvas.dataset.alto || '0.8');

    // resolución reducida: el fuego es suave, no necesita píxeles finos (y ahorra batería)
    const ESCALA = 0.35;
    const medir = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * ESCALA)), hh = Math.max(1, Math.round(canvas.clientHeight * ESCALA));
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; gl.viewport(0, 0, w, hh); }
    };
    let visible = false, raf = 0;
    const t0 = performance.now() - Math.random() * 10000;
    const cuadro = now => {
      medir();
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform1f(uA, alto);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = (visible && !reducir && !document.hidden) ? requestAnimationFrame(cuadro) : 0;
    };
    const arrancar = () => { if (!raf) raf = requestAnimationFrame(cuadro); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) arrancar(); });
    addEventListener('resize', arrancar);
  }

  const todos = () => document.querySelectorAll('canvas.fuego:not([data-on])').forEach(c => { c.dataset.on = '1'; iniciar(c); });
  // solo se enciende en modo parrilla (desde las 3 pm); si el modo cambia en vivo, se enciende entonces
  const revisar = () => { if (document.documentElement.dataset.modo === 'parrilla') todos(); };
  revisar();
  new MutationObserver(revisar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-modo'] });
})();
