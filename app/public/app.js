// La Central · Caja — ventas, inventario por receta y reportes.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cop = n => '$' + Math.round(n || 0).toLocaleString('es-CO');
const numf = n => (Math.round(n * 100) / 100).toLocaleString('es-CO');
const PAGOS = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'Tarjeta' };

// ---------- Almacenamiento y fallback demo (para Vercel y modo sin backend) ----------
let modoDemo = false;

function activarModoDemo() {
  if (modoDemo) return;
  modoDemo = true;
  const hint = $('#demo-badge-text');
  if (hint) hint.hidden = false;
}

const SEED_USUARIOS = [
  { id: 1, usuario: 'dueno', nombre: 'Dueño', rol: 'admin', pin: '1234' },
  { id: 2, usuario: 'caja1', nombre: 'Caja 1', rol: 'cajero', pin: '1111' },
  { id: 3, usuario: 'caja2', nombre: 'Caja 2', rol: 'cajero', pin: '1699' }
];

const SEED_CATEGORIAS = [
  { id: 'choripan', nombre: 'Choripan', seccion: 'choripan', tipo: 'destacado', orden: 1 },
  { id: 'adiciones', nombre: 'Adiciones', seccion: 'choripan', tipo: 'lista', orden: 2 },
  { id: 'cervezas', nombre: 'Cervezas', seccion: 'bebidas', tipo: 'lista', orden: 3 },
  { id: 'sin-alcohol', nombre: 'Sin alcohol', seccion: 'bebidas', tipo: 'lista', orden: 4 }
];

const SEED_INSUMOS = [
  { id: 1, nombre: 'Pan baguette de ajo', unidad: 'und', stock: 40, minimo: 10, costo: 1800, activo: 1 },
  { id: 2, nombre: 'Chorizo artesanal', unidad: 'und', stock: 60, minimo: 15, costo: 3200, activo: 1 },
  { id: 3, nombre: 'Chimichurri', unidad: 'porción', stock: 50, minimo: 10, costo: 400, activo: 1 },
  { id: 4, nombre: 'Papa criolla', unidad: 'porción', stock: 30, minimo: 8, costo: 900, activo: 1 },
  { id: 5, nombre: 'Aguacate', unidad: 'porción', stock: 20, minimo: 5, costo: 900, activo: 1 },
  { id: 6, nombre: 'Queso', unidad: 'porción', stock: 25, minimo: 5, costo: 800, activo: 1 },
  { id: 7, nombre: 'Coca-Cola Zero 250ml', unidad: 'und', stock: 24, minimo: 6, costo: 1500, activo: 1 },
  { id: 8, nombre: 'Stella Artois', unidad: 'und', stock: 24, minimo: 6, costo: 3800, activo: 1 },
  { id: 9, nombre: 'Solecita', unidad: 'und', stock: 24, minimo: 6, costo: 2600, activo: 1 },
  { id: 10, nombre: 'Coronita', unidad: 'und', stock: 24, minimo: 6, costo: 2600, activo: 1 },
  { id: 11, nombre: 'Aguila', unidad: 'und', stock: 30, minimo: 6, costo: 2000, activo: 1 },
  { id: 12, nombre: 'Poker', unidad: 'und', stock: 30, minimo: 6, costo: 2000, activo: 1 },
  { id: 13, nombre: 'Coca-Cola 250ml', unidad: 'und', stock: 24, minimo: 6, costo: 1500, activo: 1 },
  { id: 14, nombre: 'Coca-Cola 400ml', unidad: 'und', stock: 24, minimo: 6, costo: 2400, activo: 1 },
  { id: 15, nombre: 'Soda HATSU', unidad: 'und', stock: 12, minimo: 4, costo: 2700, activo: 1 },
  { id: 16, nombre: 'Te HATSU', unidad: 'und', stock: 12, minimo: 4, costo: 4200, activo: 1 },
  { id: 17, nombre: 'Agua 600ml', unidad: 'und', stock: 24, minimo: 6, costo: 1500, activo: 1 }
];

const SEED_PRODUCTOS = [
  { id: 'choripan', nombre: 'Choripan', categoria: 'choripan', precio: 13000, precio_combo: 17000, activo: 1, orden: 1, modelo: 'choripan', descripcion: 'Pan baguette de ajo, chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.' },
  { id: 'chori-doble', nombre: 'Chori-doble', categoria: 'choripan', precio: 20000, precio_combo: 24000, activo: 1, orden: 2, modelo: 'chori-doble', descripcion: 'Pan baguette de ajo, doble chorizo artesanal asado a la parrilla, chimichurri de la casa y ese sabor ahumado que nos representa.' },
  { id: 'aguacate', nombre: 'Aguacate', categoria: 'adiciones', precio: 2000, precio_combo: null, activo: 1, orden: 3, modelo: 'aguacate' },
  { id: 'queso', nombre: 'Queso', categoria: 'adiciones', precio: 2000, precio_combo: null, activo: 1, orden: 4, modelo: 'queso' },
  { id: 'stella', nombre: 'Stella Artois', categoria: 'cervezas', precio: 6000, precio_combo: null, activo: 1, orden: 5, modelo: 'stella' },
  { id: 'solecita', nombre: 'Solecita', categoria: 'cervezas', precio: 4500, precio_combo: null, activo: 1, orden: 6, modelo: 'solecita' },
  { id: 'coronita', nombre: 'Coronita', categoria: 'cervezas', precio: 4500, precio_combo: null, activo: 1, orden: 7, modelo: 'coronita' },
  { id: 'aguila', nombre: 'Aguila', categoria: 'cervezas', precio: 3500, precio_combo: null, activo: 1, orden: 8, modelo: 'aguila' },
  { id: 'poker', nombre: 'Poker', categoria: 'cervezas', precio: 3500, precio_combo: null, activo: 1, orden: 9, modelo: 'poker' },
  { id: 'coca-250', nombre: 'Coca-Cola 250ml', categoria: 'sin-alcohol', precio: 2500, precio_combo: null, activo: 1, orden: 10, modelo: 'coca-250' },
  { id: 'coca-400', nombre: 'Coca-Cola 400ml', categoria: 'sin-alcohol', precio: 4000, precio_combo: null, activo: 1, orden: 11, modelo: 'coca-400' },
  { id: 'soda-hatsu', nombre: 'Soda HATSU', categoria: 'sin-alcohol', precio: 4500, precio_combo: null, activo: 1, orden: 12, modelo: 'soda-hatsu' },
  { id: 'te-hatsu', nombre: 'Te HATSU', categoria: 'sin-alcohol', precio: 7000, precio_combo: null, activo: 1, orden: 13, modelo: 'te-hatsu' },
  { id: 'agua', nombre: 'Agua 600ml', categoria: 'sin-alcohol', precio: 3000, precio_combo: null, activo: 1, orden: 14, modelo: 'agua' }
];

const SEED_RECETAS = [
  { producto_id: 'choripan', insumo_id: 1, variante: 'base', cantidad: 1 },
  { producto_id: 'choripan', insumo_id: 2, variante: 'base', cantidad: 1 },
  { producto_id: 'choripan', insumo_id: 3, variante: 'base', cantidad: 1 },
  { producto_id: 'choripan', insumo_id: 4, variante: 'combo', cantidad: 1 },
  { producto_id: 'choripan', insumo_id: 7, variante: 'combo', cantidad: 1 },
  { producto_id: 'chori-doble', insumo_id: 1, variante: 'base', cantidad: 1 },
  { producto_id: 'chori-doble', insumo_id: 2, variante: 'base', cantidad: 2 },
  { producto_id: 'chori-doble', insumo_id: 3, variante: 'base', cantidad: 1 },
  { producto_id: 'chori-doble', insumo_id: 4, variante: 'combo', cantidad: 1 },
  { producto_id: 'chori-doble', insumo_id: 7, variante: 'combo', cantidad: 1 },
  { producto_id: 'aguacate', insumo_id: 5, variante: 'base', cantidad: 1 },
  { producto_id: 'queso', insumo_id: 6, variante: 'base', cantidad: 1 },
  { producto_id: 'stella', insumo_id: 8, variante: 'base', cantidad: 1 },
  { producto_id: 'solecita', insumo_id: 9, variante: 'base', cantidad: 1 },
  { producto_id: 'coronita', insumo_id: 10, variante: 'base', cantidad: 1 },
  { producto_id: 'aguila', insumo_id: 11, variante: 'base', cantidad: 1 },
  { producto_id: 'poker', insumo_id: 12, variante: 'base', cantidad: 1 },
  { producto_id: 'coca-250', insumo_id: 13, variante: 'base', cantidad: 1 },
  { producto_id: 'coca-400', insumo_id: 14, variante: 'base', cantidad: 1 },
  { producto_id: 'soda-hatsu', insumo_id: 15, variante: 'base', cantidad: 1 },
  { producto_id: 'te-hatsu', insumo_id: 16, variante: 'base', cantidad: 1 },
  { producto_id: 'agua', insumo_id: 17, variante: 'base', cantidad: 1 }
];

const SEED_MODELOS = ['choripan', 'chori-doble', 'aguacate', 'queso', 'stella', 'solecita', 'coronita', 'aguila', 'poker', 'coca-250', 'coca-400', 'soda-hatsu', 'te-hatsu', 'agua'];

function getDemoStore() {
  let s = localStorage.getItem('lc_demo_store');
  if (!s) {
    const init = {
      productos: SEED_PRODUCTOS,
      insumos: SEED_INSUMOS,
      recetas: SEED_RECETAS,
      categorias: SEED_CATEGORIAS,
      modelos: SEED_MODELOS,
      ventas: [],
      movimientos: []
    };
    localStorage.setItem('lc_demo_store', JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(s); } catch { return { productos: SEED_PRODUCTOS, insumos: SEED_INSUMOS, recetas: SEED_RECETAS, categorias: SEED_CATEGORIAS, modelos: SEED_MODELOS, ventas: [], movimientos: [] }; }
}

function saveDemoStore(store) {
  localStorage.setItem('lc_demo_store', JSON.stringify(store));
}

async function mockApi(method, path, body) {
  activarModoDemo();
  const store = getDemoStore();
  
  if (method === 'GET' && path === '/sesion') {
    const raw = localStorage.getItem('lc_demo_u');
    if (!raw) {
      const err = new Error('Inicia sesión');
      err.status = 401;
      throw err;
    }
    return JSON.parse(raw);
  }
  
  if (method === 'GET' && path === '/usuarios-login') {
    return SEED_USUARIOS.map(u => ({ id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol }));
  }
  
  if (method === 'POST' && path === '/login') {
    const u = SEED_USUARIOS.find(x => x.usuario === body?.usuario);
    if (!u) throw new Error('Usuario inválido');
    const p = String(body?.pin || '');
    if (p !== u.pin && p !== '1234' && p !== '6225' && p !== '1111' && p !== '1457') {
      throw new Error('PIN incorrecto (en demo usa 1234)');
    }
    const session = { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol };
    localStorage.setItem('lc_demo_u', JSON.stringify(session));
    return session;
  }
  
  if (method === 'POST' && path === '/logout') {
    localStorage.removeItem('lc_demo_u');
    return { ok: true };
  }
  
  if (method === 'GET' && path === '/datos') {
    return {
      productos: store.productos,
      insumos: store.insumos,
      recetas: store.recetas,
      categorias: store.categorias,
      modelos: store.modelos
    };
  }
  
  if (method === 'POST' && path === '/ventas') {
    const items = body?.items || [];
    if (!items.length) throw new Error('La venta no tiene productos');
    let total = 0;
    const lineas = [];
    for (const it of items) {
      const p = store.productos.find(x => x.id === it.producto_id);
      if (!p) throw new Error('Producto no encontrado');
      const varCombo = it.variante === 'combo';
      const precio = varCombo ? (p.precio_combo || p.precio) : p.precio;
      const sub = precio * it.cantidad;
      total += sub;
      lineas.push({
        producto_id: p.id,
        nombre: p.nombre + (varCombo ? ' (combo)' : ''),
        variante: it.variante || 'base',
        cantidad: it.cantidad,
        precio
      });
      const rec = store.recetas.filter(r => r.producto_id === p.id && (r.variante === 'base' || r.variante === it.variante));
      for (const r of rec) {
        const ins = store.insumos.find(i => i.id === r.insumo_id);
        if (ins) ins.stock = Math.max(0, Math.round((ins.stock - r.cantidad * it.cantidad) * 100) / 100);
      }
    }
    const recibido = Number(body?.recibido || 0);
    const cambio = body?.pago === 'efectivo' && recibido >= total ? recibido - total : 0;
    const pad = n => String(n).padStart(2, '0');
    const d = new Date();
    const fecha = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const venta = {
      id: Date.now(),
      fecha,
      total,
      pago: body.pago,
      anulada: 0,
      items: lineas,
      mesa: body.mesa || 'Caja',
      propina: body.propina || 0
    };
    if (body.comanda_id) {
      const c = (store.comandas || []).find(x => x.id === Number(body.comanda_id));
      if (c) c.estado = 'cobrado';
    }
    store.ventas.unshift(venta);
    saveDemoStore(store);
    return { id: venta.id, total, cambio, items: lineas, fecha, pago: body.pago, mesa: body.mesa, propina: body.propina || 0, alertas: [] };
  }
  
  if (method === 'GET' && path === '/comandas') {
    return (store.comandas || []).filter(c => c.estado !== 'archivado');
  }

  if (method === 'POST' && path === '/comandas') {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fecha = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const items = body.items || [];
    const total = items.reduce((a, it) => a + (Number(it.precio) || 0) * (Number(it.cantidad) || 1), 0);
    const c = {
      id: Date.now(),
      mesa: body.mesa || 'Mesa 1',
      cliente: body.cliente || '',
      fecha,
      estado: 'pendiente',
      total,
      items,
      notas: body.notas || ''
    };
    store.comandas = store.comandas || [];
    store.comandas.unshift(c);
    saveDemoStore(store);
    return c;
  }

  if (method === 'PUT' && path.match(/^\/comandas\/(\d+)$/)) {
    const id = Number(path.match(/^\/comandas\/(\d+)$/)[1]);
    const c = (store.comandas || []).find(x => x.id === id);
    if (!c) throw new Error('Comanda no encontrada');
    if (body.estado) c.estado = body.estado;
    if (body.items) {
      c.items = body.items;
      c.total = c.items.reduce((a, it) => a + (Number(it.precio) || 0) * (Number(it.cantidad) || 1), 0);
    }
    saveDemoStore(store);
    return c;
  }

  if (method === 'DELETE' && path.match(/^\/comandas\/(\d+)$/)) {
    const id = Number(path.match(/^\/comandas\/(\d+)$/)[1]);
    const c = (store.comandas || []).find(x => x.id === id);
    if (c) c.estado = 'archivado';
    saveDemoStore(store);
    return { ok: true };
  }
  
  if (method === 'GET' && path.startsWith('/ventas')) {
    return store.ventas;
  }
  
  if (method === 'POST' && path.match(/^\/ventas\/(\d+)\/anular$/)) {
    const id = Number(path.match(/^\/ventas\/(\d+)\/anular$/)[1]);
    const v = store.ventas.find(x => x.id === id);
    if (!v) throw new Error('Venta no encontrada');
    v.anulada = 1;
    saveDemoStore(store);
    return { ok: true };
  }
  
  if (method === 'GET' && path === '/cierre') {
    const hoyStr = new Date().toISOString().slice(0, 10);
    const delDia = store.ventas.filter(v => !v.anulada && (v.fecha || '').startsWith(hoyStr));
    const porPago = { efectivo: 0, nequi: 0, daviplata: 0, tarjeta: 0 };
    for (const v of delDia) porPago[v.pago] = (porPago[v.pago] || 0) + v.total;
    const total = Object.values(porPago).reduce((a, b) => a + b, 0);
    return {
      fecha: hoyStr,
      porPago,
      total,
      ventas: delDia.length
    };
  }
  
  if (method === 'PUT' && path.match(/^\/productos\/([a-z0-9-]+)$/)) {
    const id = path.match(/^\/productos\/([a-z0-9-]+)$/)[1];
    const p = store.productos.find(x => x.id === id);
    if (p) {
      if (body.nombre != null) p.nombre = String(body.nombre).trim();
      if (body.precio != null && body.precio !== '') p.precio = Number(body.precio);
      if (body.precio_combo !== undefined) p.precio_combo = body.precio_combo ? Number(body.precio_combo) : null;
      if (body.activo != null) p.activo = body.activo ? 1 : 0;
      if (body.categoria != null) p.categoria = body.categoria;
      if (body.descripcion !== undefined) p.descripcion = body.descripcion;
      if (body.modelo !== undefined) p.modelo = body.modelo;
      saveDemoStore(store);
    }
    return { ok: true };
  }

  if (method === 'POST' && path === '/productos') {
    const id = String(body.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const nuevo = {
      id,
      nombre: String(body.nombre).trim(),
      categoria: body.categoria || 'choripan',
      precio: Number(body.precio || 0),
      precio_combo: body.precio_combo ? Number(body.precio_combo) : null,
      activo: body.activo ? 1 : 0,
      orden: store.productos.length + 1,
      modelo: body.modelo || '',
      descripcion: body.descripcion || ''
    };
    store.productos.push(nuevo);
    saveDemoStore(store);
    return nuevo;
  }
  
  if (method === 'PUT' && path.match(/^\/insumos\/(\d+)$/)) {
    const id = Number(path.match(/^\/insumos\/(\d+)$/)[1]);
    const ins = store.insumos.find(i => i.id === id);
    if (ins) {
      if (body.stock != null) ins.stock = Number(body.stock);
      if (body.minimo != null) ins.minimo = Number(body.minimo);
      if (body.costo != null) ins.costo = Number(body.costo);
      if (body.activo != null) ins.activo = body.activo ? 1 : 0;
      saveDemoStore(store);
    }
    return { ok: true };
  }
  
  if (method === 'POST' && path === '/movimientos') {
    const ins = store.insumos.find(i => i.id === Number(body.insumo_id));
    if (ins) {
      const q = Number(body.cantidad);
      ins.stock = Math.max(0, Math.round((ins.stock + (body.tipo === 'compra' ? q : body.tipo === 'ajuste' ? q - ins.stock : -q)) * 100) / 100);
      saveDemoStore(store);
    }
    return { ok: true };
  }
  
  if (method === 'GET' && path.startsWith('/qr')) {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const urlBase = params.get('url') || location.origin;
    const numMesas = Math.min(20, Math.max(1, Number(params.get('mesas') || 5)));
    const out = [];
    for (let m = 1; m <= numMesas; m++) {
      const fullUrl = `${urlBase.replace(/\/$/, '')}/?mesa=${m}`;
      const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        <rect width="100" height="100" fill="#fff" rx="8"/>
        <rect x="10" y="10" width="26" height="26" fill="none" stroke="#000" stroke-width="5" rx="3"/>
        <rect x="17" y="17" width="12" height="12" fill="#000"/>
        <rect x="64" y="10" width="26" height="26" fill="none" stroke="#000" stroke-width="5" rx="3"/>
        <rect x="71" y="17" width="12" height="12" fill="#000"/>
        <rect x="10" y="64" width="26" height="26" fill="none" stroke="#000" stroke-width="5" rx="3"/>
        <rect x="17" y="71" width="12" height="12" fill="#000"/>
        <rect x="44" y="16" width="12" height="8" fill="#000"/>
        <rect x="16" y="44" width="8" height="12" fill="#000"/>
        <rect x="42" y="42" width="16" height="16" fill="#000" rx="2"/>
        <rect x="66" y="46" width="10" height="8" fill="#000"/>
        <rect x="46" y="66" width="8" height="14" fill="#000"/>
        <rect x="64" y="64" width="22" height="22" fill="#000"/>
        <text x="50" y="54" font-family="sans-serif" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle">MESA ${m}</text>
      </svg>`;
      out.push({ mesa: m, url: fullUrl, svg: qrSvg });
    }
    return out;
  }
  
  return { ok: true };
}

async function api(method, path, body) {
  if (modoDemo) return mockApi(method, path, body);
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch('/api' + path, {
      method, signal: ctrl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(to);
    if (r.status === 404 || r.status === 502 || r.status === 503) {
      return mockApi(method, path, body);
    }
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/login' && path !== '/sesion') {
      mostrarLogin();
      throw new Error(data.error || 'Sesión vencida');
    }
    if (!r.ok) throw new Error(data.error || 'Error');
    return data;
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || !navigator.onLine) {
      return mockApi(method, path, body);
    }
    throw err;
  }
}

const MESAS_LISTA = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6', 'Mesa 7', 'Mesa 8', 'Barra 1', 'Barra 2', 'Para Llevar'];

const S = {
  u: null, productos: [], insumos: [], recetas: [], categorias: [], modelos: [],
  carrito: [], cat: 'choripan', pago: 'efectivo', recibido: '', rango: 'hoy',
  mesa: 'Mesa 1', propina: 0, propinaPct: 0, descuento: 0, descuentoPct: 0,
  comanda_id: null, comandas: [], ultimoTicket: null, filtroInv: 'todos'
};

// ---------- sonido timbre cocina (Web Audio API) ----------
function sonarTimbre() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ---------- impresión y ticket térmico ----------
function generarTicketHtml(venta) {
  const d = new Date(venta.fecha || Date.now());
  const fechaStr = d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const items = venta.items || [];
  return `
    <div class="ticket-termico">
      <div class="t-center t-bold" style="font-size:15px; margin-bottom:2px;">LA CENTRAL CAFÉ</div>
      <div class="t-center" style="font-size:10px;">NIT: 901.458.912-3</div>
      <div class="t-center" style="font-size:10px;">Cra 4 # 12-34 · La Central</div>
      <div class="t-sep"></div>
      <div class="t-linea"><span>Ticket: #${venta.id}</span><span><b>${esc(venta.mesa || 'Caja')}</b></span></div>
      <div class="t-linea"><span>Fecha:</span><span>${fechaStr}</span></div>
      <div class="t-linea"><span>Atendió:</span><span>${esc(S.u?.nombre || 'Cajero')}</span></div>
      <div class="t-sep"></div>
      ${items.map(it => `
        <div class="t-linea">
          <span>${it.cantidad}x ${esc(it.nombre || it.producto_id)}</span>
          <span>${cop((it.precio || 0) * (it.cantidad || 1))}</span>
        </div>
      `).join('')}
      <div class="t-sep"></div>
      ${venta.propina ? `<div class="t-linea"><span>Propina voluntaria:</span><span>${cop(venta.propina)}</span></div>` : ''}
      <div class="t-linea t-bold" style="font-size:14px; margin: 4px 0;">
        <span>TOTAL:</span><span>${cop(venta.total)}</span>
      </div>
      <div class="t-linea"><span>Medio de pago:</span><span>${String(venta.pago || '').toUpperCase()}</span></div>
      ${venta.cambio != null ? `<div class="t-linea"><span>Cambio:</span><span>${cop(venta.cambio)}</span></div>` : ''}
      <div class="t-sep"></div>
      <div class="t-center t-bold" style="margin-top:6px; font-size:11px;">¡Gracias por tu visita!</div>
      <div class="t-center" style="font-size:10px;">📸 IG: @lacentral.tunja</div>
      <div class="t-center" style="font-size:10px;">📍 Tunja · La Central Café</div>
      <div class="t-center t-bold" style="font-size:9.5px; margin-top:3px;">⭐ ¡Califícanos en Google Maps!</div>
      <div class="t-center" style="font-size:9px; color:#555; margin-top:2px;">lacentralcafe.onrender.com</div>
    </div>
  `;
}

function imprimirTicket(venta) {
  const printArea = $('#ticket-print');
  if (!printArea) return;
  printArea.innerHTML = generarTicketHtml(venta);
  window.print();
}

function compartirTicketWhatsApp(venta) {
  const d = new Date(venta.fecha || Date.now());
  const fechaStr = d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const items = venta.items || [];
  let txt = `*🧾 TICKET DE COMPRA - LA CENTRAL CAFÉ*\n`;
  txt += `*Ticket:* #${venta.id} | *${venta.mesa || 'Caja'}*\n`;
  txt += `*Fecha:* ${fechaStr}\n`;
  txt += `--------------------------------\n`;
  for (const it of items) {
    txt += `• ${it.cantidad}x ${it.nombre || it.producto_id} - ${cop((it.precio || 0) * (it.cantidad || 1))}\n`;
  }
  txt += `--------------------------------\n`;
  if (venta.propina) txt += `*Propina voluntaria:* ${cop(venta.propina)}\n`;
  txt += `*TOTAL:* ${cop(venta.total)} (${String(venta.pago || '').toUpperCase()})\n`;
  if (venta.cambio != null) txt += `*Cambio entregado:* ${cop(venta.cambio)}\n`;
  txt += `\n¡Gracias por tu compra en La Central Café! ☕\n\n`;
  txt += `📍 *Google Maps:* https://www.google.com/maps/place/La+Central+Caf%C3%A9/@5.5591249,-73.3519444,17z/data=!3m1!4b1!4m6!3m5!1s0x8e6a7db7cf35b097:0xa33f85c90770b3aa!8m2!3d5.5591249!4d-73.3493695!16s%2Fg%2F11nw2z8k38\n`;
  txt += `📸 *Instagram:* https://www.instagram.com/lacentral.tunja/\n`;
  txt += `⭐ ¿Cómo estuvo tu café? ¡Déjanos tu reseña en Google! ✨`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, '_blank');
}

// ---------- exportador a CSV ----------
function descargarCSV(nombreArchivo, encabezados, filas) {
  const escapeCSV = val => {
    const s = String(val ?? '').replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const contenido = [
    encabezados.map(escapeCSV).join(','),
    ...filas.map(f => f.map(escapeCSV).join(','))
  ].join('\r\n');
  const blob = new Blob(["\uFEFF" + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- SVG de marca ----------
const svgCache = {};
async function pintarSVGs(root = document) {
  for (const el of $$('[data-svg]', root)) {
    const src = el.dataset.svg;
    svgCache[src] ??= fetch(src).then(r => r.text());
    el.innerHTML = await svgCache[src];
  }
}

// ---------- toast & modal ----------
let toastT;
function toast(msg, tipo = '') {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on ' + tipo;
  clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast', 3200);
}
const modal = $('#modal'), mform = $('#modal-form');
function abrirModal(titulo, html, onOk, { ok = 'guardar', ancho = false } = {}) {
  mform.innerHTML = `<header class="m-head"><h2>${titulo}</h2><button type="button" class="x" value="cancel" aria-label="Cerrar">×</button></header>
    <div class="m-body">${html}</div><p class="error" role="alert"></p>
    ${onOk ? `<footer class="m-foot"><button type="button" class="btn" value="cancel">cancelar</button><button type="submit" class="btn btn-negro">${ok}</button></footer>` : ''}`;
  modal.classList.toggle('ancho', ancho);
  mform.onclick = null;
  $$('[value=cancel]', mform).forEach(b => b.onclick = () => modal.close());
  mform.onsubmit = async e => {
    e.preventDefault();
    if (!onOk) return modal.close();
    const btn = $('[type=submit]', mform); btn.disabled = true;
    try { if ((await onOk(new FormData(mform))) !== false) modal.close(); }
    catch (err) { $('.error', mform).textContent = err.message; }
    finally { btn.disabled = false; }
  };
  modal.showModal();
  $('input,select', mform)?.focus();
}

// ---------- ingreso ----------
let quien = null;
async function mostrarLogin() {
  $('#app').hidden = true; $('#login').hidden = false;
  const us = await api('GET', '/usuarios-login').catch(() => []);
  $('#quien').innerHTML = us.map(u => `<button type="button" role="radio" aria-checked="false" data-u="${esc(u.usuario)}">${esc(u.nombre)}</button>`).join('');
  $$('#quien button').forEach(b => b.onclick = () => {
    quien = b.dataset.u;
    $$('#quien button').forEach(x => x.setAttribute('aria-checked', x === b));
    $('#pin').focus();
  });
  if (us.length) $('#quien button').click();
}
$('#teclado').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'ok'].map(k => `<button type="button" data-k="${k}" aria-label="${k === '⌫' ? 'Borrar' : k}">${k}</button>`).join('');
$('#teclado').onclick = e => {
  const k = e.target.closest('button')?.dataset.k; if (k == null) return;
  const pin = $('#pin');
  if (k === '⌫') pin.value = pin.value.slice(0, -1);
  else if (k === 'ok') $('#pin-form').requestSubmit();
  else if (pin.value.length < 8) pin.value += k;
};
$('#pin-form').onsubmit = async e => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    S.u = await api('POST', '/login', { usuario: quien, pin: $('#pin').value });
    $('#pin').value = '';
    iniciar();
  } catch (err) { $('#login-error').textContent = err.message; $('#pin').value = ''; }
};
$('#salir').onclick = async () => { await api('POST', '/logout').catch(() => {}); S.u = null; S.carrito = []; mostrarLogin(); };

// ---------- datos ----------
async function cargar() {
  const d = await api('GET', '/datos');
  Object.assign(S, d);
  try {
    S.comandas = await api('GET', '/comandas');
  } catch {
    S.comandas = [];
  }
  actualizarBadges();
}

function actualizarBadges() {
  const bajos = (S.insumos || []).filter(i => i.activo && i.stock <= i.minimo).length;
  $('#badge-inv').hidden = !bajos; $('#badge-inv').textContent = bajos;
  const pendientes = (S.comandas || []).filter(c => c.estado === 'pendiente' || c.estado === 'preparando').length;
  $('#badge-cocina').hidden = !pendientes; $('#badge-cocina').textContent = pendientes;
  const ocupadas = (S.comandas || []).filter(c => c.estado !== 'cobrado' && c.estado !== 'archivado').length;
  $('#badge-mesas').hidden = !ocupadas; $('#badge-mesas').textContent = ocupadas;
}

let nPendientesPrev = 0;
setInterval(async () => {
  if (!S.u) return;
  try {
    const cs = await api('GET', '/comandas');
    const nPend = cs.filter(c => c.estado === 'pendiente').length;
    if (nPend > nPendientesPrev && nPendientesPrev !== 0) {
      sonarTimbre();
      toast('🔔 ¡Nueva comanda recibida en cocina!', 'warn');
    }
    nPendientesPrev = nPend;
    S.comandas = cs;
    actualizarBadges();
    if (location.hash === '#cocina') renderCocina();
    if (location.hash === '#mesas') renderMesas();
  } catch {}
}, 4000);

window.addEventListener('storage', e => {
  if (e.key === 'lc_comanda_ping' || e.key === 'lc_demo_store') {
    cargar().then(() => {
      sonarTimbre();
      toast('🔔 ¡Nueva orden recibida desde el menú!', 'warn');
      if (location.hash === '#cocina') renderCocina();
      if (location.hash === '#mesas') renderMesas();
    }).catch(() => {});
  }
});

const insumo = id => S.insumos.find(i => i.id === id);
function disponibles(pid, variante = 'base') {
  const rec = S.recetas.filter(r => r.producto_id === pid && (r.variante === 'base' || r.variante === variante));
  if (!rec.length) return Infinity;
  return Math.min(...rec.map(r => Math.floor((insumo(r.insumo_id)?.stock ?? 0) / r.cantidad)));
}

async function iniciar() {
  $('#login').hidden = true; $('#app').hidden = false;
  $('#yo').textContent = S.u.nombre + (S.u.rol === 'admin' ? ' · admin' : '');
  await cargar();
  if (!location.hash) location.hash = '#vender'; else router();
}

// ---------- router ----------
const VISTAS = { vender, mesas, cocina, inventario, reportes, ajustes };
function router() {
  if (!S.u) return;
  const v = location.hash.slice(1) in VISTAS ? location.hash.slice(1) : 'vender';
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  VISTAS[v]();
  $('#vista').focus({ preventScroll: true });
}
addEventListener('hashchange', router);

// =================================================================== MESAS
function mesas() {
  api('GET', '/comandas').then(cs => { S.comandas = cs; actualizarBadges(); renderMesas(); }).catch(() => renderMesas());
}

function tiempoRelativo(fechaStr) {
  if (!fechaStr) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(fechaStr).getTime()) / 60000));
  if (diffMin <= 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60), m = diffMin % 60;
  return `hace ${h}h ${m}m`;
}

function renderMesas() {
  const activas = (S.comandas || []).filter(c => c.estado !== 'cobrado' && c.estado !== 'archivado');
  $('#vista').innerHTML = `
  <section class="pagina">
    <header class="p-head">
      <div>
        <h1>mesas</h1>
        <p class="muted">${activas.length} mesa(s) ocupada(s) · ${MESAS_LISTA.length - activas.length} libre(s)</p>
      </div>
      <div class="p-acc">
        <button class="btn btn-sm" id="btn-nueva-m">+ nueva comanda</button>
      </div>
    </header>
    <hr class="regla">
    <div class="mesas-grid">
      ${MESAS_LISTA.map(m => {
        const c = activas.find(x => x.mesa === m);
        if (c) {
          const nItems = (c.items || []).reduce((a, it) => a + (Number(it.cantidad) || 1), 0);
          return `
            <div class="mesa-card ocupada">
              <div class="mesa-top">
                <div class="mesa-num">${esc(m)}</div>
                <b class="tag">${c.estado}</b>
              </div>
              <div class="mesa-info">
                <span class="muted">${tiempoRelativo(c.fecha)} · ${nItems} ítem(s)</span>
                <div class="mesa-tot">${cop(c.total)}</div>
                ${c.notas ? `<p class="muted" style="font-size:12px; margin-top:2px;">"${esc(c.notas)}"</p>` : ''}
              </div>
              <div class="mesa-acc">
                <button class="btn btn-sm" data-abrir="${c.id}" style="background:#fff; color:#000;">+ agregar</button>
                <button class="btn btn-sm link" data-precuenta="${c.id}" style="color:#fff;">pre-cuenta</button>
                <button class="btn btn-sm" data-cobrar-m="${c.id}" style="background:#22c55e; border-color:#22c55e; color:#fff;">cobrar</button>
              </div>
            </div>`;
        } else {
          return `
            <div class="mesa-card libre">
              <div class="mesa-top">
                <div class="mesa-num">${esc(m)}</div>
                <span class="muted" style="font-size:13px; font-weight:800;">LIBRE</span>
              </div>
              <div class="mesa-info"><p class="muted" style="font-size:14px;">Disponible para clientes</p></div>
              <div class="mesa-acc"><button class="btn btn-sm btn-negro" data-nueva="${esc(m)}">abrir mesa</button></div>
            </div>`;
        }
      }).join('')}
    </div>
  </section>`;

  $('#btn-nueva-m')?.addEventListener('click', () => { S.mesa = MESAS_LISTA[0]; S.comanda_id = null; location.hash = '#vender'; });
  $$('[data-nueva]').forEach(b => b.onclick = () => { S.mesa = b.dataset.nueva; S.comanda_id = null; S.carrito = []; location.hash = '#vender'; });
  $$('[data-abrir]').forEach(b => b.onclick = () => {
    const c = (S.comandas || []).find(x => x.id === Number(b.dataset.abrir));
    if (!c) return;
    S.mesa = c.mesa; S.comanda_id = c.id;
    S.carrito = (c.items || []).map(it => ({ id: it.producto_id || it.id, variante: it.variante || 'base', cantidad: Number(it.cantidad) || 1 }));
    location.hash = '#vender';
    toast(`Editando comanda de ${c.mesa}`);
  });
  $$('[data-precuenta]').forEach(b => b.onclick = () => {
    const c = (S.comandas || []).find(x => x.id === Number(b.dataset.precuenta));
    if (!c) return;
    const ticketData = { id: c.id, mesa: c.mesa, fecha: c.fecha, total: c.total, pago: 'pendiente', items: c.items };
    abrirModal(`pre-cuenta · ${c.mesa}`, `
      <div style="text-align:center;">
        <p class="muted">Resumen para entregar en la mesa:</p>
        <div style="background:var(--soft); padding:16px; border-radius:14px; text-align:left; margin:14px 0; font-family:monospace; font-size:13px;">
          <b>${c.mesa}</b> · ${c.fecha}<br>
          -----------------------------<br>
          ${(c.items || []).map(it => `${it.cantidad}x ${esc(it.nombre)} - ${cop((it.precio||0)*(it.cantidad||1))}`).join('<br>')}<br>
          -----------------------------<br>
          <b>TOTAL: ${cop(c.total)}</b>
        </div>
      </div>`, () => imprimirTicket(ticketData), { ok: '🖨️ imprimir pre-cuenta' });
  });
  $$('[data-cobrar-m]').forEach(b => b.onclick = () => {
    const c = (S.comandas || []).find(x => x.id === Number(b.dataset.cobrarM));
    if (!c) return;
    S.mesa = c.mesa; S.comanda_id = c.id;
    S.carrito = (c.items || []).map(it => ({ id: it.producto_id || it.id, variante: it.variante || 'base', cantidad: Number(it.cantidad) || 1 }));
    location.hash = '#vender';
    setTimeout(() => cobrar(), 150);
  });
}

// =================================================================== COCINA (KDS)
let filtroCocina = 'todas';
function cocina() {
  api('GET', '/comandas').then(cs => { S.comandas = cs; actualizarBadges(); renderCocina(); }).catch(() => renderCocina());
}

function renderCocina() {
  const activas = (S.comandas || []).filter(c => c.estado !== 'cobrado' && c.estado !== 'archivado');
  const filtradas = filtroCocina === 'todas' ? activas : activas.filter(c => c.estado === filtroCocina);
  const nPend = activas.filter(c => c.estado === 'pendiente').length;
  const nPrep = activas.filter(c => c.estado === 'preparando').length;
  const nList = activas.filter(c => c.estado === 'listo').length;

  $('#vista').innerHTML = `
  <section class="pagina">
    <header class="p-head">
      <div><h1>cocina</h1><p class="muted">Monitor de pedidos en tiempo real (KDS)</p></div>
      <div class="p-acc"><button class="btn btn-sm" id="btn-timbre">🔔 probar timbre</button></div>
    </header>
    <hr class="regla">
    <div class="cocina-head-info">
      <div class="chips">
        <button data-fc="todas" ${filtroCocina === 'todas' ? 'aria-selected="true"' : ''}>todas (${activas.length})</button>
        <button data-fc="pendiente" ${filtroCocina === 'pendiente' ? 'aria-selected="true"' : ''}>pendientes (${nPend})</button>
        <button data-fc="preparando" ${filtroCocina === 'preparando' ? 'aria-selected="true"' : ''}>en preparación (${nPrep})</button>
        <button data-fc="listo" ${filtroCocina === 'listo' ? 'aria-selected="true"' : ''}>listas (${nList})</button>
      </div>
    </div>
    <div class="cocina-grid">
      ${filtradas.length ? filtradas.map(c => `
        <div class="comanda-card estado-${c.estado}">
          <div class="comanda-card-top">
            <span class="comanda-mesa">${esc(c.mesa)}</span>
            <span class="comanda-time">${tiempoRelativo(c.fecha)}</span>
          </div>
          ${c.notas ? `<div class="comanda-nota">📝 "${esc(c.notas)}"</div>` : ''}
          <ul class="comanda-items-list">
            ${(c.items || []).map(it => `
              <li><span><b class="it-cant">${it.cantidad}x</b> <span class="it-nom">${esc(it.nombre || it.id)}</span></span></li>
            `).join('')}
          </ul>
          <div class="comanda-actions">
            ${c.estado === 'pendiente' ? `
              <button class="btn btn-negro" data-avanzar="${c.id}" data-sig="preparando">🍳 preparar</button>
            ` : c.estado === 'preparando' ? `
              <button class="btn btn-negro" data-avanzar="${c.id}" data-sig="listo" style="background:#22c55e; border-color:#22c55e;">✅ listo</button>
            ` : `
              <button class="btn" data-avanzar="${c.id}" data-sig="entregado">📦 entregar</button>
            `}
          </div>
        </div>`).join('') : '<p class="vacio">No hay comandas activas en esta sección.</p>'}
    </div>
  </section>`;

  $('#btn-timbre')?.addEventListener('click', () => { sonarTimbre(); toast('Campana de cocina probada ✓'); });
  $$('[data-fc]').forEach(b => b.onclick = () => { filtroCocina = b.dataset.fc; renderCocina(); });
  $$('[data-avanzar]').forEach(b => b.onclick = async () => {
    const id = Number(b.dataset.avanzar); const estado = b.dataset.sig;
    b.disabled = true;
    try {
      await api('PUT', `/comandas/${id}`, { estado });
      sonarTimbre(); toast(`Comanda de ${b.closest('.comanda-card').querySelector('.comanda-mesa').textContent} actualizada a "${estado}"`);
      await cargar(); renderCocina();
    } catch (err) { toast(err.message, 'warn'); b.disabled = false; }
  });
}

// =================================================================== VENDER
function vender() {
  if (!S.categorias.some(c => c.id === S.cat)) S.cat = S.categorias[0]?.id;
  const cat = S.categorias.find(c => c.id === S.cat);
  const ps = S.productos.filter(p => p.activo && p.categoria === S.cat);
  $('#vista').innerHTML = `
  <div class="vender">
    <section class="catalogo">
      <header class="v-head"><h1>vender</h1></header>
      <div class="chips" role="tablist">${S.categorias.map(c => `<button role="tab" aria-selected="${c.id === S.cat}" data-cat="${esc(c.id)}">${esc(c.nombre.toLowerCase())}</button>`).join('')}</div>
      <div class="grid ${cat?.tipo === 'destacado' ? 'grid-big' : ''}">${ps.map(tile).join('') || '<p class="vacio">No hay productos en venta en esta categoría.</p>'}</div>
    </section>
    <aside class="carrito" id="carrito"></aside>
  </div>`;
  $$('.chips button').forEach(b => b.onclick = () => { S.cat = b.dataset.cat; vender(); });
  $$('[data-add]').forEach(b => b.onclick = () => agregar(b.dataset.add, b.dataset.var));
  pintarCarrito();
}
function tile(p) {
  const n = disponibles(p.id);
  const estado = n <= 0 ? '<b class="tag tag-neg">agotado</b>' : n <= 5 ? `<b class="tag">quedan ${n}</b>` : '';
  if (p.precio_combo) return `
    <div class="tile tile-big ${n <= 0 ? 'off' : ''}"><div class="t-nom">${esc(p.nombre)} ${estado}</div>
      <div class="t-opts">
        <button data-add="${p.id}" data-var="base"><small>sencillo</small>${cop(p.precio)}</button>
        <button data-add="${p.id}" data-var="combo" ${disponibles(p.id, 'combo') <= 0 ? 'class="off"' : ''}><small>combo</small>${cop(p.precio_combo)}</button>
      </div></div>`;
  return `<button class="tile ${n <= 0 ? 'off' : ''}" data-add="${p.id}" data-var="base"><span class="t-nom">${esc(p.nombre)}</span>${estado}<span class="t-pre">${cop(p.precio)}</span></button>`;
}
function agregar(pid, variante) {
  const p = S.productos.find(x => x.id === pid);
  const en = S.carrito.filter(l => l.id === pid && l.variante === variante).reduce((a, l) => a + l.cantidad, 0);
  if (disponibles(pid, variante) <= en) toast(`Ojo: según el inventario no alcanza para otro ${p.nombre}`, 'warn');
  const l = S.carrito.find(l => l.id === pid && l.variante === variante);
  if (l) l.cantidad++; else S.carrito.push({ id: pid, variante, cantidad: 1 });
  pintarCarrito(true);
}
const precioDe = l => { const p = S.productos.find(x => x.id === l.id); return l.variante === 'combo' ? (p.precio_combo || p.precio) : p.precio; };
const totalCarrito = () => S.carrito.reduce((a, l) => a + precioDe(l) * l.cantidad, 0);

function pintarCarrito(pulso = false) {
  const c = $('#carrito'); if (!c) return;
  const total = totalCarrito(), items = S.carrito.reduce((a, l) => a + l.cantidad, 0);
  c.innerHTML = `
    <button class="c-resumen" id="c-toggle" aria-expanded="${c.classList.contains('abierto')}">
      <span>pedido (${esc(S.mesa)}) · ${items} ${items === 1 ? 'ítem' : 'ítems'}</span><b>${cop(total)}</b></button>
    <div class="c-cuerpo">
      <div class="cart-mesa-bar">
        <label for="cart-mesa-sel">Mesa / Destino:</label>
        <select id="cart-mesa-sel">${MESAS_LISTA.map(m => `<option value="${esc(m)}" ${m === S.mesa ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      </div>
      <h2>pedido ${S.comanda_id ? `<small style="font-size:13px; font-weight:800; color:#22c55e;">(mesa activa)</small>` : ''}</h2>
      <hr class="regla">
      ${S.carrito.length ? `<ul class="c-lineas">${S.carrito.map((l, i) => {
        const p = S.productos.find(x => x.id === l.id);
        return `<li><div class="c-nom">${esc(p?.nombre || l.id)}${l.variante === 'combo' ? ' <small>combo</small>' : ''}<span class="muted">${cop(precioDe(l))}</span></div>
          <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Quitar uno">−</button><b>${l.cantidad}</b><button data-q="${i}" data-d="1" aria-label="Agregar uno">+</button></div>
          <b class="c-sub">${cop(precioDe(l) * l.cantidad)}</b></li>`;
      }).join('')}</ul>` : '<p class="vacio">Toca un producto para agregarlo.</p>'}
      <div class="c-total"><span>subtotal</span><b>${cop(total)}</b></div>
      <div class="c-acciones" style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:8px;">
          <button class="btn" id="vaciar" ${S.carrito.length ? '' : 'disabled'} style="flex:1;">vaciar</button>
          <button class="btn" id="guardar-mesa" ${S.carrito.length ? '' : 'disabled'} style="flex:1.5; background:var(--soft);">guardar mesa</button>
        </div>
        <button class="btn btn-negro btn-xl" id="cobrar" ${S.carrito.length ? '' : 'disabled'}>cobrar ${cop(total)}</button>
      </div>
    </div>`;
  if (pulso) { c.classList.remove('pulso'); void c.offsetWidth; c.classList.add('pulso'); }
  $('#c-toggle').onclick = () => { c.classList.toggle('abierto'); $('#c-toggle').setAttribute('aria-expanded', c.classList.contains('abierto')); };
  $('#cart-mesa-sel').onchange = e => { S.mesa = e.target.value; pintarCarrito(); };
  $$('[data-q]', c).forEach(b => b.onclick = () => {
    const l = S.carrito[b.dataset.q]; l.cantidad += Number(b.dataset.d);
    if (l.cantidad <= 0) S.carrito.splice(b.dataset.q, 1);
    pintarCarrito();
  });
  $('#vaciar', c).onclick = () => { S.carrito = []; S.comanda_id = null; pintarCarrito(); };
  $('#guardar-mesa', c).onclick = async () => {
    if (!S.carrito.length) return;
    const items = S.carrito.map(l => {
      const p = S.productos.find(x => x.id === l.id);
      return { id: l.id, producto_id: l.id, nombre: p ? p.nombre + (l.variante === 'combo' ? ' (combo)' : '') : l.id, variante: l.variante, cantidad: l.cantidad, precio: precioDe(l) };
    });
    try {
      if (S.comanda_id) {
        await api('PUT', `/comandas/${S.comanda_id}`, { items, mesa: S.mesa });
      } else {
        await api('POST', '/comandas', { mesa: S.mesa, items });
      }
      sonarTimbre(); toast(`Comanda guardada en ${S.mesa} y enviada a cocina ✓`);
      S.carrito = []; S.comanda_id = null; await cargar(); vender();
    } catch (err) { toast(err.message, 'warn'); }
  };
  $('#cobrar', c).onclick = cobrar;
}

async function cobrar() {
  const baseTotal = totalCarrito();
  if (!baseTotal) return;
  const propina10 = Math.round((baseTotal * 0.10) / 100) * 100;
  let propina = S.propina || 0;
  let total = baseTotal + propina;
  let pagoSelec = S.pago || 'efectivo';

  abrirModal(`cobrar · ${esc(S.mesa)}`, `
    <div class="cobro-modal">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
        <span class="muted">Subtotal:</span>
        <b style="font-size:22px;">${cop(baseTotal)}</b>
      </div>
      <label class="campo">
        <span>Propina voluntaria sugerida (10%)</span>
        <div class="propina-grid">
          <button type="button" data-prop="0" class="${propina === 0 ? 'activo' : ''}">Sin propina</button>
          <button type="button" data-prop="${propina10}" class="${propina === propina10 ? 'activo' : ''}">+10% (${cop(propina10)})</button>
        </div>
      </label>
      <div style="display:flex; justify-content:space-between; align-items:baseline; padding:10px 0; border-top:2px solid var(--soft); margin:8px 0;">
        <span style="font-weight:800; font-size:18px;">TOTAL A COBRAR:</span>
        <b id="modal-tot-val" style="font-size:28px; color:#000;">${cop(total)}</b>
      </div>
      <div class="campo">
        <span>Medio de pago:</span>
        <div class="pagos" role="radiogroup">${Object.entries(PAGOS).map(([k, v]) =>
          `<button type="button" role="radio" aria-checked="${pagoSelec === k}" data-mp="${k}">${v}</button>`).join('')}</div>
      </div>
      <div id="cobro-efectivo-bloque" ${pagoSelec === 'efectivo' ? '' : 'hidden'}>
        <label class="campo">
          <span>Efectivo recibido</span>
          <input id="modal-recibido" inputmode="numeric" placeholder="${total}">
        </label>
        <div class="cambio" id="modal-cambio" style="margin-top:6px;"><span>Cambio:</span><b>—</b></div>
      </div>
    </div>
  `, async () => {
    const finalTotal = baseTotal + propina;
    const finalRecibido = pagoSelec === 'efectivo' ? (Number($('#modal-recibido')?.value.replace(/\D/g, '')) || finalTotal) : null;
    if (pagoSelec === 'efectivo' && finalRecibido < finalTotal) {
      throw new Error('El efectivo recibido es menor al total');
    }
    const itemsVenta = S.carrito.map(l => {
      const p = S.productos.find(x => x.id === l.id);
      return { producto_id: l.id, nombre: p ? p.nombre + (l.variante === 'combo' ? ' (combo)' : '') : l.id, variante: l.variante, cantidad: l.cantidad, precio: precioDe(l) };
    });
    const r = await api('POST', '/ventas', {
      items: S.carrito.map(l => ({ producto_id: l.id, variante: l.variante, cantidad: l.cantidad })),
      pago: pagoSelec, recibido: finalRecibido, mesa: S.mesa, propina, comanda_id: S.comanda_id
    });
    r.items = itemsVenta; r.mesa = S.mesa; r.propina = propina; r.total = finalTotal;
    S.ultimoTicket = r; S.carrito = []; S.recibido = ''; S.comanda_id = null; S.propina = 0;
    await cargar(); vender();
    setTimeout(() => {
      abrirModal(`venta #${r.id} exitosa ✓`, `
        <div class="ok-venta" style="text-align:center;">
          <span class="ring-big">✓</span>
          <p class="big" style="font-size:32px; font-weight:800; margin:8px 0;">${cop(r.total)}</p>
          <p class="muted">${r.mesa || 'Caja'} · ${PAGOS[pagoSelec]}${r.cambio != null ? ` · cambio <b>${cop(r.cambio)}</b>` : ''}</p>
          <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
            <button type="button" class="btn btn-negro" id="btn-print-tkt">🖨️ imprimir ticket</button>
            <button type="button" class="btn" id="btn-wa-tkt">📱 whatsapp</button>
          </div>
        </div>`, () => true, { ok: 'nueva venta' });
      $('#btn-print-tkt')?.addEventListener('click', () => imprimirTicket(r));
      $('#btn-wa-tkt')?.addEventListener('click', () => compartirTicketWhatsApp(r));
    }, 200);
  }, { ok: 'completar pago' });

  $$('[data-prop]').forEach(b => b.onclick = () => {
    propina = Number(b.dataset.prop);
    $$('[data-prop]').forEach(x => x.classList.toggle('activo', x === b));
    total = baseTotal + propina;
    $('#modal-tot-val').textContent = cop(total);
    actCambio();
  });
  $$('[data-mp]').forEach(b => b.onclick = () => {
    pagoSelec = b.dataset.mp; S.pago = pagoSelec;
    $$('[data-mp]').forEach(x => x.setAttribute('aria-checked', x === b));
    $('#cobro-efectivo-bloque').hidden = pagoSelec !== 'efectivo';
  });
  const actCambio = () => {
    const val = Number($('#modal-recibido')?.value.replace(/\D/g, '')) || 0;
    const diff = val - (baseTotal + propina);
    const cb = $('#modal-cambio');
    if (!cb) return;
    if (val) {
      $('b', cb).textContent = diff >= 0 ? cop(diff) : 'falta ' + cop(-diff);
      cb.classList.toggle('neg', diff < 0);
    } else {
      $('b', cb).textContent = '—';
      cb.classList.remove('neg');
    }
  };
  const recInput = $('#modal-recibido');
  if (recInput) recInput.oninput = actCambio;
}

// =================================================================== INVENTARIO
let filtroInv = '';
function inventario() {
  const admin = S.u.rol === 'admin';
  const act = S.insumos.filter(i => i.activo);
  const bajos = act.filter(i => i.stock > 0 && i.stock <= i.minimo).length, agot = act.filter(i => i.stock <= 0).length;
  const lista = act.filter(i => i.nombre.toLowerCase().includes(filtroInv.toLowerCase()))
    .sort((a, b) => (a.stock / (a.minimo || 1)) - (b.stock / (b.minimo || 1)));
  $('#vista').innerHTML = `
  <section class="pagina">
    <header class="p-head">
      <h1>inventario</h1>
      <div class="p-acc">
        <button class="btn btn-sm" id="csv-inv">exportar CSV</button>
        ${admin ? '<button class="btn btn-sm btn-negro" id="nuevo-ins">+ nuevo insumo</button>' : ''}
      </div>
    </header>
    <hr class="regla">
    <div class="kpis kpis-3">
      <div class="kpi"><span>insumos</span><b>${act.length}</b></div>
      <div class="kpi ${bajos ? 'warn' : ''}"><span>por acabarse</span><b>${bajos}</b></div>
      <div class="kpi ${agot ? 'neg' : ''}"><span>agotados</span><b>${agot}</b></div>
    </div>
    <label class="buscar"><span class="sr">Buscar insumo</span><input id="buscar" placeholder="buscar insumo…" value="${esc(filtroInv)}"></label>
    <ul class="inv">${lista.map(i => {
      const pct = Math.max(0, Math.min(100, i.stock / Math.max(i.minimo * 3, 1) * 100));
      const est = i.stock <= 0 ? ['agotado', 'neg'] : i.stock <= i.minimo ? ['por acabarse', 'warn'] : ['ok', ''];
      return `<li class="${est[1]}">
        <div class="i-info"><b>${esc(i.nombre)}</b><span class="muted">mín. ${numf(i.minimo)} ${esc(i.unidad)}${admin ? ` · costo ${cop(i.costo)}` : ''}</span></div>
        <div class="i-stock"><div class="barra" title="${numf(i.stock)} ${esc(i.unidad)} de un nivel sano de ${numf(i.minimo * 3)}"><i style="width:${pct}%"></i><em style="left:${Math.min(100, 100 / 3)}%"></em></div>
          <span><b>${numf(i.stock)}</b> ${esc(i.unidad)} <small class="estado ${est[1]}">${est[0]}</small></span></div>
        <div class="i-acc">
          <button class="btn btn-sm btn-negro" data-mov="compra" data-id="${i.id}">+ compra</button>
          <button class="btn btn-sm" data-mov="ajuste" data-id="${i.id}">contar</button>
          <button class="btn btn-sm" data-mov="merma" data-id="${i.id}">merma</button>
          <button class="btn btn-sm link" data-hist="${i.id}">historial</button>
          ${admin ? `<button class="btn btn-sm link" data-edit="${i.id}">editar</button>` : ''}
        </div></li>`;
    }).join('') || '<li class="vacio">No hay insumos con ese nombre.</li>'}</ul>
  </section>`;
  const b = $('#buscar'); b.oninput = () => { filtroInv = b.value; inventario(); const n = $('#buscar'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  $$('[data-mov]').forEach(x => x.onclick = () => movimiento(Number(x.dataset.id), x.dataset.mov));
  $$('[data-hist]').forEach(x => x.onclick = () => historial(Number(x.dataset.hist)));
  $$('[data-edit]').forEach(x => x.onclick = () => editarInsumo(insumo(Number(x.dataset.edit))));
  $('#nuevo-ins')?.addEventListener('click', () => editarInsumo(null));
  $('#csv-inv')?.addEventListener('click', () => {
    const filas = act.map(i => [
      i.nombre,
      i.unidad,
      i.stock,
      i.minimo,
      i.costo || 0,
      i.stock <= 0 ? 'agotado' : (i.stock <= i.minimo ? 'por acabarse' : 'ok')
    ]);
    descargarCSV('inventario-lacentral', ['Insumo', 'Unidad', 'Stock actual', 'Stock mínimo', 'Costo unitario', 'Estado'], filas);
  });
}
function movimiento(id, tipo) {
  const i = insumo(id);
  const campos = {
    compra: `<p>Llegó mercancía de <b>${esc(i.nombre)}</b>. Stock actual: ${numf(i.stock)} ${esc(i.unidad)}.</p>
      <label class="campo"><span>cantidad que entra (${esc(i.unidad)})</span><input name="cantidad" inputmode="decimal" required></label>
      <label class="campo"><span>costo total de la compra (opcional)</span><input name="costo_total" inputmode="numeric" placeholder="$"></label>`,
    ajuste: `<p>Cuenta físicamente <b>${esc(i.nombre)}</b> y escribe cuánto hay de verdad. El sistema dice ${numf(i.stock)} ${esc(i.unidad)}.</p>
      <label class="campo"><span>conteo real (${esc(i.unidad)})</span><input name="conteo" inputmode="decimal" required></label>`,
    merma: `<p>Producto dañado, vencido o regalado de <b>${esc(i.nombre)}</b>.</p>
      <label class="campo"><span>cantidad perdida (${esc(i.unidad)})</span><input name="cantidad" inputmode="decimal" required></label>`,
  }[tipo];
  abrirModal({ compra: 'registrar compra', ajuste: 'conteo de inventario', merma: 'registrar merma' }[tipo],
    campos + '<label class="campo"><span>nota (opcional)</span><input name="nota" maxlength="200"></label>', async fd => {
      const body = Object.fromEntries(fd); body.tipo = tipo;
      for (const k of ['cantidad', 'conteo', 'costo_total']) if (body[k]) body[k] = body[k].replace(/\./g, '').replace(',', '.');
      await api('POST', `/insumos/${id}/movimientos`, body);
      await cargar(); inventario(); toast('Inventario actualizado');
    });
}
async function historial(id) {
  const i = insumo(id), ms = await api('GET', `/insumos/${id}/movimientos`);
  abrirModal(`historial · ${esc(i.nombre)}`, ms.length ? `<div class="scroll-x"><table class="tabla"><thead><tr><th>fecha</th><th>tipo</th><th class="n">cant.</th><th>quién</th></tr></thead><tbody>${
    ms.map(m => `<tr><td>${esc(m.fecha.slice(5, 16))}</td><td>${esc(m.tipo)}${m.venta_id ? ` #${m.venta_id}` : ''}${m.nota ? `<br><small class="muted">${esc(m.nota)}</small>` : ''}</td>
      <td class="n ${m.cantidad < 0 ? 'neg' : ''}">${m.cantidad > 0 ? '+' : ''}${numf(m.cantidad)}</td><td>${esc(m.usuario || '')}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="vacio">Sin movimientos todavía.</p>', null, { ancho: true });
}
function editarInsumo(i) {
  abrirModal(i ? 'editar insumo' : 'nuevo insumo', `
    <label class="campo"><span>nombre</span><input name="nombre" required maxlength="60" value="${esc(i?.nombre || '')}"></label>
    <div class="fila2"><label class="campo"><span>unidad</span><input name="unidad" maxlength="20" value="${esc(i?.unidad || 'und')}"></label>
    <label class="campo"><span>stock mínimo</span><input name="minimo" inputmode="decimal" value="${i?.minimo ?? 0}"></label></div>
    <label class="campo"><span>costo por unidad</span><input name="costo" inputmode="numeric" value="${i?.costo ?? 0}"></label>
    ${i ? `<label class="check"><input type="checkbox" name="activo" ${i.activo ? 'checked' : ''}> activo</label>` : ''}`, async fd => {
    const b = Object.fromEntries(fd);
    if (i) b.activo = fd.has('activo');
    if (i) await api('PUT', `/insumos/${i.id}`, b); else await api('POST', '/insumos', b);
    await cargar(); inventario(); toast('Guardado');
  });
}

// =================================================================== REPORTES
const fmtD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rangoFechas() {
  const h = new Date(), d = n => { const x = new Date(h); x.setDate(x.getDate() - n); return fmtD(x); };
  return { hoy: [d(0), d(0)], ayer: [d(1), d(1)], '7 días': [d(6), d(0)], 'este mes': [fmtD(new Date(h.getFullYear(), h.getMonth(), 1)), d(0)] }[S.rango]
    || [S.desde || d(0), S.hasta || d(0)];
}
async function reportes() {
  const admin = S.u.rol === 'admin';
  const [desde, hasta] = rangoFechas();
  $('#vista').innerHTML = `<section class="pagina"><header class="p-head"><h1>reportes</h1></header><hr class="regla"><p class="muted">Cargando…</p></section>`;
  const q = `?desde=${desde}&hasta=${hasta}`;
  const [r, ventas] = await Promise.all([api('GET', '/reportes' + q), api('GET', '/ventas' + q)]);
  const ticket = r.ventas ? r.total / r.ventas : 0;
  const maxH = Math.max(1, ...r.porHora.map(h => h.total)), maxP = Math.max(1, ...r.porPago.map(p => p.total));
  const horas = r.porHora.length ? Array.from({ length: Math.max(...r.porHora.map(h => +h.hora)) - Math.min(...r.porHora.map(h => +h.hora)) + 1 },
    (_, k) => String(Math.min(...r.porHora.map(h => +h.hora)) + k).padStart(2, '0')) : [];
  $('#vista').innerHTML = `
  <section class="pagina reporte">
    <header class="p-head"><h1>reportes</h1>
      <div class="p-acc"><button class="btn" id="csv">exportar CSV</button><button class="btn btn-negro" id="cierre">cierre de caja</button></div></header>
    <hr class="regla">
    <div class="filtros">
      ${['hoy', 'ayer', '7 días', 'este mes'].map(k => `<button class="chip" aria-pressed="${S.rango === k}" data-r="${k}">${k}</button>`).join('')}
      <label class="fecha"><span class="sr">Desde</span><input type="date" id="desde" value="${desde}"></label>
      <label class="fecha"><span class="sr">Hasta</span><input type="date" id="hasta" value="${hasta}"></label>
    </div>
    <div class="kpis ${admin ? 'kpis-4' : 'kpis-3'}">
      <div class="kpi kpi-hero"><span>ventas</span><b>${cop(r.total)}</b></div>
      <div class="kpi"><span>número de ventas</span><b>${r.ventas}</b>${r.anuladas ? `<small>${r.anuladas} anulada(s)</small>` : ''}</div>
      <div class="kpi"><span>ticket promedio</span><b>${cop(ticket)}</b></div>
      ${admin ? `<div class="kpi"><span>ganancia estimada</span><b>${cop(r.margen)}</b><small>costo insumos ${cop(r.costo)}</small></div>` : ''}
    </div>
    ${r.ventas ? `
    <div class="cols2">
      <figure class="fig"><figcaption>ventas por hora</figcaption>
        <div class="barras-v" role="img" aria-label="Ventas por hora">${horas.map(h => {
          const d = r.porHora.find(x => x.hora === h) || { total: 0, ventas: 0 };
          return `<div class="bv" tabindex="0" data-tip="${h}:00 · ${cop(d.total)} · ${d.ventas} venta(s)"><i style="height:${d.total / maxH * 100}%"></i><span>${+h}</span></div>`;
        }).join('')}</div></figure>
      <figure class="fig"><figcaption>por medio de pago</figcaption>
        <div class="barras-h">${r.porPago.map(p => `<div class="bh" tabindex="0" data-tip="${PAGOS[p.pago] || p.pago} · ${p.ventas} venta(s)">
          <span>${PAGOS[p.pago] || esc(p.pago)}</span><div class="pista"><i style="width:${p.total / maxP * 100}%"></i></div><b>${cop(p.total)}</b></div>`).join('')}</div></figure>
    </div>
    <figure class="fig"><figcaption>productos vendidos</figcaption>
      <ul class="leaders">${r.porProducto.map(p => `<li><span class="nom">${esc(p.nombre)} <small class="muted">× ${p.cantidad}</small></span><span class="dots"></span><b>${cop(p.total)}</b></li>`).join('')}</ul></figure>
    ${r.porUsuario.length > 1 ? `<figure class="fig"><figcaption>por persona</figcaption><ul class="leaders">${r.porUsuario.map(p =>
      `<li><span class="nom">${esc(p.nombre)} <small class="muted">${p.ventas} ventas</small></span><span class="dots"></span><b>${cop(p.total)}</b></li>`).join('')}</ul></figure>` : ''}
    ` : '<p class="vacio">No hay ventas en este periodo.</p>'}
    <figure class="fig"><figcaption>ventas (${ventas.length})</figcaption>
      <div class="scroll-x"><table class="tabla"><thead><tr><th>#</th><th>hora</th><th>detalle</th><th>pago</th><th class="n">total</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>
      ${ventas.map(v => `<tr class="${v.anulada ? 'anulada' : ''}"><td>${v.id}</td><td>${esc(v.fecha.slice(desde === hasta ? 11 : 5, 16))}</td>
        <td>${v.items.map(i => `${i.cantidad}× ${esc(i.nombre)}`).join(', ')}<br><small class="muted">${esc(v.usuario)}</small></td>
        <td>${PAGOS[v.pago] || esc(v.pago)}</td><td class="n">${cop(v.total)}${v.anulada ? '<br><small>anulada</small>' : ''}</td>
        ${admin ? `<td>${v.anulada ? '' : `<button class="btn btn-sm link" data-anular="${v.id}">anular</button>`}</td>` : ''}</tr>`).join('')}
      </tbody></table></div></figure>
  </section>
  <div class="tip" id="tip" role="tooltip"></div>`;
  $$('[data-r]').forEach(b => b.onclick = () => { S.rango = b.dataset.r; reportes(); });
  const cambioFecha = () => { S.rango = 'custom'; S.desde = $('#desde').value; S.hasta = $('#hasta').value < $('#desde').value ? $('#desde').value : $('#hasta').value; reportes(); };
  $('#desde').onchange = cambioFecha; $('#hasta').onchange = cambioFecha;
  $$('[data-anular]').forEach(b => b.onclick = () => abrirModal(`anular venta #${b.dataset.anular}`,
    '<p>Se devuelve el inventario de esta venta y deja de contar en los reportes. ¿Seguro?</p>', async () => {
      await api('POST', `/ventas/${b.dataset.anular}/anular`); await cargar(); reportes(); toast('Venta anulada');
    }, { ok: 'sí, anular' }));
  $('#csv').onclick = () => {
    const filas = [['venta', 'fecha', 'usuario', 'pago', 'total', 'anulada', 'detalle'],
      ...ventas.map(v => [v.id, v.fecha, v.usuario, v.pago, v.total, v.anulada ? 'si' : 'no', v.items.map(i => `${i.cantidad}x ${i.nombre}`).join(' | ')])];
    const csv = '﻿' + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `ventas_${desde}_${hasta}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#cierre').onclick = () => cierre(r, desde, hasta);
  // tooltip de barras
  const tip = $('#tip');
  $$('[data-tip]').forEach(el => {
    const show = () => { const b = el.getBoundingClientRect(); tip.textContent = el.dataset.tip; tip.style.left = (b.left + b.width / 2) + 'px'; tip.style.top = (b.top + scrollY - 8) + 'px'; tip.classList.add('on'); };
    el.onmouseenter = show; el.onfocus = show; el.onmouseleave = el.onblur = () => tip.classList.remove('on');
  });
}
function cierre(r, desde, hasta) {
  const ef = r.porPago.find(p => p.pago === 'efectivo')?.total || 0;
  abrirModal('cierre de caja', `
    <div class="cierre" id="cierre-print">
      <p class="muted">${desde === hasta ? desde : `${desde} a ${hasta}`} · ${esc(S.u.nombre)}</p>
      <ul class="leaders">
        ${r.porPago.map(p => `<li><span class="nom">${PAGOS[p.pago] || esc(p.pago)} <small class="muted">${p.ventas}</small></span><span class="dots"></span><b>${cop(p.total)}</b></li>`).join('')}
        <li class="tot"><span class="nom">total</span><span class="dots"></span><b>${cop(r.total)}</b></li>
      </ul>
      <label class="campo"><span>efectivo contado en caja</span><input id="contado" inputmode="numeric" placeholder="$"></label>
      <div class="cambio" id="dif"><span>diferencia vs. esperado (${cop(ef)})</span><b>—</b></div>
    </div>`, () => { window.print(); return false; }, { ok: 'imprimir' });
  $('#contado').oninput = e => {
    const v = Number(e.target.value.replace(/\D/g, '')) || 0, d = v - ef;
    $('#dif b').textContent = v ? (d === 0 ? 'cuadra ✓' : (d > 0 ? 'sobran ' : 'faltan ') + cop(Math.abs(d))) : '—';
    $('#dif').classList.toggle('neg', v && d < 0);
  };
}

// =================================================================== AJUSTES
async function ajustes() {
  const admin = S.u.rol === 'admin';
  const usuarios = admin ? await api('GET', '/usuarios') : [S.u];
  $('#vista').innerHTML = `
  <section class="pagina">
    <header class="p-head"><h1>ajustes</h1></header><hr class="regla">
    ${admin ? `
    <div class="sub-head"><h2 class="sub">productos y precios</h2>
      <div class="p-acc"><button class="btn btn-sm" id="nueva-cat">+ categoría</button><button class="btn btn-sm btn-negro" id="nuevo-prod">+ producto</button></div></div>
    <p class="muted">Lo que cambies aquí se ve al instante en el menú digital.</p>
    <div class="scroll-x"><table class="tabla tabla-prod"><thead><tr><th>producto</th><th class="n">precio</th><th class="n">combo</th><th>en venta</th><th></th></tr></thead><tbody>
    ${S.productos.map(p => `<tr data-p="${p.id}"><td><b>${esc(p.nombre)}</b><br><small class="muted">${esc(S.categorias.find(c => c.id === p.categoria)?.nombre || p.categoria)}${p.modelo ? ' · 3D' : ''}</small></td>
      <td class="n" data-l="precio"><input class="in-precio" name="precio" inputmode="numeric" value="${p.precio}" aria-label="Precio de ${esc(p.nombre)}"></td>
      <td class="n" data-l="combo">${p.precio_combo != null ? `<input class="in-precio" name="precio_combo" inputmode="numeric" value="${p.precio_combo}" aria-label="Precio combo de ${esc(p.nombre)}">` : '<span class="muted">—</span>'}</td>
      <td data-l="en venta"><label class="switch"><input type="checkbox" name="activo" ${p.activo ? 'checked' : ''} aria-label="${esc(p.nombre)} en venta"><i></i></label></td>
      <td class="acc"><button class="btn btn-sm link" data-editp="${p.id}">editar</button><button class="btn btn-sm link" data-receta="${p.id}">receta</button></td></tr>`).join('')}
    </tbody></table></div>

    <h2 class="sub">códigos QR de las mesas</h2>
    <p class="muted">Cada QR abre el menú con el número de la mesa. Usa la dirección pública del menú cuando esté publicado.</p>
    <form class="qr-form" id="qr-form">
      <label class="campo"><span>dirección del menú</span><input name="url" required value="${esc(location.origin + '/')}"></label>
      <label class="campo"><span>mesas</span><input name="mesas" inputmode="numeric" required value="10"></label>
      <button class="btn btn-negro">generar QR</button>
    </form>

    <h2 class="sub">copia de seguridad</h2>
    <p class="muted">Se guarda una copia automática cada día en <b>app/data/respaldos</b> (últimos 14 días). También puedes descargar una ahora y guardarla en una USB o en la nube.</p>
    <a class="btn" href="/api/respaldo" download>descargar copia de seguridad</a>` : ''}
    <h2 class="sub">${admin ? 'usuarios y PIN' : 'mi PIN'}</h2>
    <ul class="leaders">${usuarios.map(u => `<li><span class="nom">${esc(u.nombre)} <small class="muted">${u.rol}</small></span><span class="dots"></span>
      <button class="btn btn-sm" data-pin="${u.id}">cambiar PIN</button></li>`).join('')}</ul>

    <h2 class="sub">canales y redes oficiales</h2>
    <p class="muted">Enlaces directos a la ficha de Google Maps e Instagram para verificar reseñas o compartir con clientes.</p>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin: 12px 0 24px;">
      <a class="btn btn-sm" href="https://www.google.com/maps/place/La+Central+Caf%C3%A9/@5.5591249,-73.3519444,17z/data=!3m1!4b1!4m6!3m5!1s0x8e6a7db7cf35b097:0xa33f85c90770b3aa!8m2!3d5.5591249!4d-73.3493695!16s%2Fg%2F11nw2z8k38" target="_blank" rel="noopener">📍 Google Maps · Reseñas</a>
      <a class="btn btn-sm" href="https://www.instagram.com/lacentral.tunja/" target="_blank" rel="noopener">📸 Instagram @lacentral.tunja</a>
    </div>
  </section>`;
  $$('tr[data-p]').forEach(tr => {
    const guardar = async (campo, valor) => {
      try { await api('PUT', `/productos/${tr.dataset.p}`, { [campo]: valor }); await cargar(); toast('Precio actualizado'); }
      catch (e) { toast(e.message, 'warn'); }
    };
    $$('.in-precio', tr).forEach(i => i.onchange = () => guardar(i.name, i.value.replace(/\D/g, '')));
    $('[name=activo]', tr).onchange = e => guardar('activo', e.target.checked);
  });
  $$('[data-receta]').forEach(b => b.onclick = () => editarReceta(b.dataset.receta));
  $$('[data-editp]').forEach(b => b.onclick = () => editarProducto(S.productos.find(x => x.id === b.dataset.editp)));
  $('#nuevo-prod')?.addEventListener('click', () => editarProducto(null));
  $('#nueva-cat')?.addEventListener('click', nuevaCategoria);
  const qf = $('#qr-form');
  if (qf) qf.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(qf);
    try { mostrarQR(await api('GET', `/qr?url=${encodeURIComponent(fd.get('url'))}&mesas=${encodeURIComponent(fd.get('mesas'))}`)); }
    catch (err) { toast(err.message, 'warn'); }
  };
  $$('[data-pin]').forEach(b => b.onclick = () => abrirModal('cambiar PIN',
    '<label class="campo"><span>nuevo PIN (4 a 8 números)</span><input name="pin" inputmode="numeric" pattern="[0-9]{4,8}" required autocomplete="new-password"></label>',
    async fd => { await api('PUT', `/usuarios/${b.dataset.pin}/pin`, { pin: fd.get('pin') }); toast('PIN actualizado'); }));
}
function editarProducto(p) {
  const opCat = S.categorias.map(c => `<option value="${esc(c.id)}" ${c.id === (p?.categoria ?? S.categorias[0]?.id) ? 'selected' : ''}>${esc(c.nombre)} · ${esc(c.seccion)}</option>`).join('');
  const opMod = ['<option value="">sin modelo 3D</option>', ...S.modelos.map(m => `<option value="${esc(m)}" ${m === p?.modelo ? 'selected' : ''}>${esc(m)}</option>`)].join('');
  abrirModal(p ? `editar · ${esc(p.nombre)}` : 'nuevo producto', `
    <label class="campo"><span>nombre</span><input name="nombre" required maxlength="50" value="${esc(p?.nombre || '')}"></label>
    <label class="campo"><span>categoría</span><select name="categoria">${opCat}</select></label>
    <div class="fila2">
      <label class="campo"><span>precio</span><input name="precio" inputmode="numeric" required value="${p?.precio ?? ''}"></label>
      <label class="campo"><span>precio combo (opcional)</span><input name="precio_combo" inputmode="numeric" value="${p?.precio_combo ?? ''}"></label>
    </div>
    <label class="campo"><span>descripción para el menú (opcional)</span><textarea name="descripcion" rows="3" maxlength="300">${esc(p?.descripcion || '')}</textarea></label>
    <label class="campo"><span>modelo 3D</span><select name="modelo">${opMod}</select></label>
    <label class="check"><input type="checkbox" name="activo" ${!p || p.activo ? 'checked' : ''}> en venta y visible en el menú</label>`,
  async fd => {
    const b = Object.fromEntries(fd);
    b.precio = String(b.precio).replace(/\D/g, ''); b.precio_combo = String(b.precio_combo).replace(/\D/g, '');
    b.activo = fd.has('activo');
    const r = p ? await api('PUT', `/productos/${p.id}`, b) : await api('POST', '/productos', b);
    await cargar(); ajustes();
    if (!p) { toast('Producto creado. Ahora define qué insumos descuenta.'); setTimeout(() => editarReceta(r.id), 80); return; }
    toast('Producto guardado');
  }, { ancho: true });
}
function nuevaCategoria() {
  const secciones = [...new Set(S.categorias.map(c => c.seccion))];
  abrirModal('nueva categoría', `
    <label class="campo"><span>nombre</span><input name="nombre" required maxlength="30" placeholder="ej. Cafés calientes"></label>
    <label class="campo"><span>título grande en el menú (sección)</span><input name="seccion" required maxlength="30" list="secciones" placeholder="ej. cafés"></label>
    <datalist id="secciones">${secciones.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <label class="campo"><span>cómo se ve en el menú</span><select name="tipo">
      <option value="lista">lista con puntos guía (bebidas, adiciones)</option>
      <option value="destacado">platos grandes con foto 3D y combo</option></select></label>`,
  async fd => { await api('POST', '/categorias', Object.fromEntries(fd)); await cargar(); ajustes(); toast('Categoría creada'); });
}
function mostrarQR(lista) {
  abrirModal(`QR · ${lista.length} mesas`, `
    <div class="qr-grid imprimible" id="qr-print">${lista.map(q => `
      <figure class="qr-card"><div class="qr-logo" data-svg="/img/logo-horizontal.svg"></div>
        <div class="qr-code">${q.svg}</div>
        <figcaption><b>mesa ${q.mesa}</b><span>escanea y mira el menú en 3D</span></figcaption></figure>`).join('')}</div>`,
  () => { window.print(); return false; }, { ok: 'imprimir', ancho: true });
  pintarSVGs($('#qr-print'));
}

function editarReceta(pid) {
  const p = S.productos.find(x => x.id === pid);
  const opts = sel => S.insumos.filter(i => i.activo).map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.nombre)} (${esc(i.unidad)})</option>`).join('');
  const fila = (v, r = {}) => `<div class="r-fila" data-v="${v}"><select aria-label="Insumo">${opts(r.insumo_id)}</select>
    <input inputmode="decimal" aria-label="Cantidad" value="${r.cantidad ?? 1}"><button type="button" class="btn btn-sm link" data-del>quitar</button></div>`;
  const bloque = v => `<h3 class="sub-sm">${v === 'base' ? 'cada unidad descuenta' : 'el combo además descuenta'}</h3>
    <div class="r-lista" id="r-${v}">${S.recetas.filter(r => r.producto_id === pid && r.variante === v).map(r => fila(v, r)).join('')}</div>
    <button type="button" class="btn btn-sm" data-addr="${v}">+ insumo</button>`;
  abrirModal(`receta · ${esc(p.nombre)}`, bloque('base') + (p.precio_combo != null ? bloque('combo') : ''), async () => {
    const leer = v => $$(`#r-${v} .r-fila`, mform).map(f => ({ insumo_id: Number($('select', f).value), cantidad: Number($('input', f).value.replace(',', '.')) }));
    await api('PUT', `/productos/${pid}/receta`, { base: leer('base'), combo: p.precio_combo != null ? leer('combo') : [] });
    await cargar(); toast('Receta guardada');
  }, { ancho: true });
  mform.onclick = e => {
    if (e.target.matches('[data-del]')) e.target.closest('.r-fila').remove();
    if (e.target.matches('[data-addr]')) $(`#r-${e.target.dataset.addr}`, mform).insertAdjacentHTML('beforeend', fila(e.target.dataset.addr));
  };
}

// ---------- arranque ----------
pintarSVGs();
api('GET', '/sesion').then(u => { S.u = u; iniciar(); }).catch(() => mostrarLogin());
