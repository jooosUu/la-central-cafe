// La Central Café — logo animado (generado por tools/build_ae.py)
// Uso manual: After Effects > Archivo > Scripts > Ejecutar archivo de script…
// Crea las composiciones "La Central - Logo 1x1", "9x16" y "16x9".
(function () {
var D = /*__DATA__*/null;
var CREAM = [1, 1, 1], INK = [0.02, 0.02, 0.02]; // blanco y negro, como el .ai
var FPS = 60, DUR = 10;
var BEAT = 0.55, TAIL = 7.6;   // intro: segundos por palabra; TAIL: duración después de la intro
var OFF = 0;   // desfase de tiempo global para keys()

// ---------- utilidades ----------
function keys(prop, ks) { // ks: [t, valor, influenciaEntrada, influenciaSalida]  ('L' = lineal)
    var i, j;
    for (i = 0; i < ks.length; i++) prop.setValueAtTime(ks[i][0] + OFF, ks[i][1]);
    var n = prop.isSpatial ? 1 : (prop.value instanceof Array ? prop.value.length : 1);
    for (i = 0; i < ks.length; i++) {
        var a = ks[i][2], b = ks[i][3];
        var ia = (a === undefined || a === 'L') ? 60 : a, ib = (b === undefined || b === 'L') ? 60 : b;
        var ein = [], eout = [];
        for (j = 0; j < n; j++) { ein.push(new KeyframeEase(0, ia)); eout.push(new KeyframeEase(0, ib)); }
        prop.setTemporalEaseAtKey(i + 1, ein, eout);
        if (a === 'L' || b === 'L') {
            prop.setInterpolationTypeAtKey(i + 1,
                a === 'L' ? KeyframeInterpolationType.LINEAR : KeyframeInterpolationType.BEZIER,
                b === 'L' ? KeyframeInterpolationType.LINEAR : KeyframeInterpolationType.BEZIER);
        }
    }
}
function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function T(L) { return L.property("ADBE Transform Group"); }
function P(L, n) { return T(L).property(n); } // "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"

function shapeLayer(comp, d, color, parent) {
    var L = comp.layers.addShape();
    L.name = d.name;
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    g.name = "forma";
    var gc = g.property("ADBE Vectors Group");
    for (var i = 0; i < d.paths.length; i++) {
        var s = new Shape();
        s.vertices = d.paths[i].v; s.inTangents = d.paths[i].i; s.outTangents = d.paths[i].o; s.closed = true;
        gc.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(s);
    }
    gc.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(color);
    P(L, "ADBE Anchor Point").setValue([0, 0]);
    P(L, "ADBE Position").setValue(d.pos);
    L.motionBlur = true;
    if (parent) L.setParentWithJump(parent);
    return { L: L, g: g };
}
function ellipseLayer(comp, name, pos, diam, fill, stroke, strokeW, parent) {
    var L = comp.layers.addShape();
    L.name = name;
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var gc = g.property("ADBE Vectors Group");
    gc.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([diam, diam]);
    var st = null;
    if (fill) gc.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(fill);
    if (stroke) {
        st = gc.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue(stroke);
        st.property("ADBE Vector Stroke Width").setValue(strokeW);
    }
    P(L, "ADBE Anchor Point").setValue([0, 0]);
    P(L, "ADBE Position").setValue(pos);
    L.motionBlur = true;
    if (parent) L.setParentWithJump(parent);
    return { L: L, stroke: st };
}
function nullAt(comp, name, anchor, pos, parent) {
    var N = comp.layers.addNull(DUR);
    N.name = name;
    P(N, "ADBE Anchor Point").setValue(anchor);
    P(N, "ADBE Position").setValue(pos);
    if (parent) N.setParentWithJump(parent);
    N.enabled = false;
    return N;
}
function rectLayer(comp, name, x0, y0, x1, y1, parent) {
    var L = comp.layers.addShape();
    L.name = name;
    var gc = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
    var r = gc.addProperty("ADBE Vector Shape - Rect");
    r.property("ADBE Vector Rect Size").setValue([x1 - x0, y1 - y0]);
    r.property("ADBE Vector Rect Position").setValue([(x0 + x1) / 2, (y0 + y1) / 2]);
    gc.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([1, 1, 1]);
    P(L, "ADBE Anchor Point").setValue([0, 0]);
    P(L, "ADBE Position").setValue([0, 0]);
    if (parent) L.setParentWithJump(parent);
    return L;
}
function rectShape(x0, y0, x1, y1) {
    var s = new Shape();
    s.vertices = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    s.closed = true;
    return s;
}
function pathBox(d) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = 0; i < d.paths.length; i++) for (var j = 0; j < d.paths[i].v.length; j++) {
        var v = d.paths[i].v[j];
        x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]);
    }
    return [x0, y0, x1, y1];
}

// ---------- construcción ----------
function build(name, W, H, intro) {
    var nW = intro ? D.words.length : 0;
    DUR = nW * BEAT + TAIL;
    var comp = app.project.items.addComp(name, W, H, 1, DUR, FPS);
    comp.bgColor = INK;
    comp.motionBlur = true;
    comp.shutterAngle = 200;
    comp.shutterPhase = -100;
    var dy = (H - 1080) / 2;
    var IMPACT = [487, 470];

    comp.layers.addSolid(INK, "Fondo negro", W, H, 1);
    var scene = nullAt(comp, "Escena", [540, 540], [W / 2, H / 2], null);

    // 0. Intro tipográfica: palabras grandes con cortes secos blanco/negro
    OFF = 0;
    for (var w = 0; w < nW; w++) {
        var wd = D.words[w], t0 = w * BEAT, dark = (w % 2 === 1);
        var bgc = dark ? INK : CREAM, fg = dark ? CREAM : INK;
        var sol = comp.layers.addSolid(bgc, "Intro fondo " + (w + 1), W, H, 1);
        var wm = rectLayer(comp, "Intro máscara " + (w + 1), -400, -400, 1480, wd.pos[1] + wd.size * 0.3, scene);
        var wl = shapeLayer(comp, wd, fg, scene).L;
        keys(P(wl, "ADBE Position"), [[t0, add(wd.pos, [0, wd.size * 1.2]), 33, 6], [t0 + 0.42, add(wd.pos, [0, 4]), 92, 60], [t0 + BEAT, add(wd.pos, [0, -6]), 'L', 'L']]);
        wl.setTrackMatte(wm, TrackMatteType.ALPHA);
        var lays = [sol, wm, wl];
        for (var z = 0; z < 3; z++) { lays[z].inPoint = t0; lays[z].outPoint = t0 + BEAT; }
        wm.enabled = false;
    }
    OFF = nW * BEAT;

    // 1. Gota blanca que cae sobre negro
    var drop = ellipseLayer(comp, "Gota", [IMPACT[0], -140 - dy], 40, CREAM, null, 0, scene).L;
    keys(P(drop, "ADBE Position"), [[0.15, [IMPACT[0], -140 - dy], 60, 75], [0.62, IMPACT, 'L', 60]]);
    keys(P(drop, "ADBE Scale"), [[0.15, [85, 115]], [0.62, [70, 150], 60, 'L']]);
    keys(P(drop, "ADBE Opacity"), [[0.62, 100], [0.66, 0]]);

    // 2. Onda + el blanco llena el cuadro
    var radius = Math.sqrt(W * W + H * H) * 2.3; // escala % de un círculo de 100px
    var ring = ellipseLayer(comp, "Onda", IMPACT, 100, null, CREAM, 3, scene);
    keys(P(ring.L, "ADBE Scale"), [[0.62, [10, 10], 33, 8], [1.3, [520, 520], 92, 33]]);
    keys(P(ring.L, "ADBE Opacity"), [[0.62, 100], [1.2, 0]]);
    ring.L.inPoint = OFF + 0.6;
    var white = ellipseLayer(comp, "Blanco", IMPACT, 100, CREAM, null, 0, scene).L;
    keys(P(white, "ADBE Scale"), [[0.72, [0, 0], 33, 6], [1.55, [radius, radius], 94, 33]]);

    // Cámara: empuje lento y continuo
    var cierre = nullAt(comp, "Cierre (sube el logo)", [540, 540], [540, 540], scene);
    keys(P(cierre, "ADBE Position"), [[4.3, [540, 540], 33, 8], [5.3, [540, 430], 93, 33]]);
    keys(P(cierre, "ADBE Scale"), [[4.3, [100, 100], 33, 8], [5.3, [86, 86], 93, 33]]);
    var cam = nullAt(comp, "Cámara (zoom lento)", [540, 540], [540, 540], cierre);
    keys(P(cam, "ADBE Scale"), [[0.9, [96, 96], 33, 20], [DUR - OFF, [100, 100], 60, 33]]);

    // 3. Taza: sube y se asienta (curva expo, sin rebote)
    var cupD = D.cup, cp = cupD.pos;
    var cup = shapeLayer(comp, cupD, INK, cam).L;
    keys(P(cup, "ADBE Position"), [[1.0, add(cp, [0, 70]), 33, 8], [1.9, cp, 92, 33]]);
    keys(P(cup, "ADBE Scale"), [[1.0, [88, 88], 33, 8], [1.9, [100, 100], 92, 33]]);
    keys(P(cup, "ADBE Opacity"), [[1.0, 0], [1.25, 100]]);

    // 4. Vapor: se revela de abajo hacia arriba y ondula suave
    for (var k = 0; k < 3; k++) {
        var sd = D.steam[k];
        var st = shapeLayer(comp, sd, INK, cam);
        var s0 = 1.55 + k * 0.12;
        var b = pathBox(sd);
        var m = st.L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        m.property("ADBE Mask Feather").setValue([0, 16]);
        keys(m.property("ADBE Mask Shape"), [
            [s0, rectShape(b[0] - 30, b[3] + 12, b[2] + 30, b[3] + 14), 33, 10],
            [s0 + 1.0, rectShape(b[0] - 30, b[1] - 30, b[2] + 30, b[3] + 14), 90, 33]]);
        var gt = st.g.property("ADBE Vector Transform Group");
        gt.property("ADBE Vector Skew").expression =
            "var s=" + (s0 + OFF) + ";Math.sin(time*2.2+" + (k * 1.4) + ")*4.5*ease(time,s,s+1.2,0,1)";
        gt.property("ADBE Vector Scale").expression =
            "var s=" + (s0 + OFF) + ";var a=1+0.025*Math.sin(time*1.8+" + k + ")*ease(time,s,s+1.2,0,1);[100,100*a]";
    }

    // 5. "café": cada letra sube desde detrás de la línea base (máscara)
    var mCafe = rectLayer(comp, "Máscara café", -200, 560, 1280, 868, cam);
    for (var c = 0; c < D.cafe.length; c++) {
        var ld = D.cafe[c], p = ld.pos, t = 2.0 + c * 0.07;
        var L = shapeLayer(comp, ld, INK, cam).L;
        keys(P(L, "ADBE Position"), [[t, add(p, [0, 210]), 33, 6], [t + 0.95, p, 93, 33]]);
        L.setTrackMatte(mCafe, TrackMatteType.ALPHA);
    }
    mCafe.enabled = false;
    // tilde: baja y aparece, sin rebote
    var ad = D.accent;
    var A = shapeLayer(comp, ad, INK, cam).L;
    keys(P(A, "ADBE Position"), [[2.55, add(ad.pos, [0, -36]), 33, 8], [3.35, ad.pos, 92, 33]]);
    keys(P(A, "ADBE Opacity"), [[2.55, 0], [2.85, 100]]);

    // 6. "la central": sube desde su línea base, letra por letra
    var mLc = rectLayer(comp, "Máscara la central", -200, 600, 1280, 725, cam);
    for (var i = 0; i < D.lacentral.length; i++) {
        var lc = D.lacentral[i], tl = 2.45 + i * 0.03;
        var Lc = shapeLayer(comp, lc, INK, cam).L;
        keys(P(Lc, "ADBE Position"), [[tl, add(lc.pos, [0, 44]), 33, 6], [tl + 0.8, lc.pos, 93, 33]]);
        Lc.setTrackMatte(mLc, TrackMatteType.ALPHA);
    }

    mLc.enabled = false;

    // 7. ®: aparece discreto
    var R = shapeLayer(comp, D.reg, INK, cam).L;
    keys(P(R, "ADBE Opacity"), [[3.2, 0], [3.6, 100]]);
    keys(P(R, "ADBE Scale"), [[3.2, [70, 70], 33, 8], [3.8, [100, 100], 92, 33]]);

    // 8. Cierre: regla gruesa redondeada + íconos en anillo (como el menú del .ai)
    var rule = comp.layers.addShape();
    rule.name = "Regla";
    var rg = rule.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
    var ln = new Shape(); ln.vertices = [[280, 782], [750, 782]]; ln.inTangents = [[0, 0], [0, 0]]; ln.outTangents = [[0, 0], [0, 0]]; ln.closed = false;   // regla centrada en el eje óptico del logo (515)
    rg.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(ln);
    var rs = rg.addProperty("ADBE Vector Graphic - Stroke");
    rs.property("ADBE Vector Stroke Color").setValue(INK);
    rs.property("ADBE Vector Stroke Width").setValue(13);
    rs.property("ADBE Vector Stroke Line Cap").setValue(2);   // redondeado
    var trim = rule.property("ADBE Root Vectors Group").addProperty("ADBE Vector Filter - Trim");
    P(rule, "ADBE Anchor Point").setValue([0, 0]); P(rule, "ADBE Position").setValue([0, 0]);
    rule.setParentWithJump(scene);
    keys(trim.property("ADBE Vector Trim Start"), [[4.75, 50, 33, 8], [5.6, 0, 92, 33]]);
    keys(trim.property("ADBE Vector Trim End"), [[4.75, 50, 33, 8], [5.6, 100, 92, 33]]);

    var ICON_Y = 880;
    var mIco = rectLayer(comp, "Máscara íconos", -200, 700, 1280, ICON_Y + 52, scene);
    for (var n = 0; n < D.icons.length; n++) {
        var ic = D.icons[n];
        ic.pos = [ic.pos[0], ICON_Y];
        var IL = shapeLayer(comp, ic, INK, scene).L;
        var ti = 5.15 + n * 0.08;
        keys(P(IL, "ADBE Position"), [[ti, [ic.pos[0], ICON_Y + 120], 33, 6], [ti + 0.8, ic.pos, 93, 33]]);
        IL.setTrackMatte(mIco, TrackMatteType.ALPHA);
    }
    mIco.enabled = false;

    scene.moveToBeginning(); cam.moveToBeginning();
    return comp;
}

app.beginUndoGroup("La Central - logo animado");
if (!app.project) app.newProject();
// Composiciones en la raíz del proyecto (visibles al abrir); los sólidos van a su carpeta
var comps;
try {
comps = [build("1 · La Central - Logo 1x1", 1080, 1080, true), build("2 · La Central - Logo 9x16", 1080, 1920, true),
         build("3 · La Central - Logo 16x9", 1920, 1080, true), build("4 · La Central - Logo 1x1 SIN INTRO", 1080, 1080, false)];
} catch (err) {
    if ($.getenv("LACENTRAL_AUTO") === "1") {
        var msg = ("L" + err.line + "_" + err.toString()).replace(/[^A-Za-z0-9_ ]/g, "_").substr(0, 120);
        app.project.save(new File("__AEP__".replace(".aep", "_ERROR_" + msg + ".aep")));
        app.quit();
    }
    throw err;
}
var solids = app.project.items.addFolder("_sólidos");
for (var q = app.project.numItems; q >= 1; q--) {
    var it = app.project.item(q);
    if (it instanceof FootageItem && it.mainSource instanceof SolidSource) it.parentFolder = solids;
}
app.endUndoGroup();
try { comps[0].openInViewer(); } catch (e) {}

if (typeof AUTO_SAVE !== "undefined" || $.getenv("LACENTRAL_AUTO") === "1") {
    app.project.save(new File("__AEP__"));
    app.quit();
}
})();
