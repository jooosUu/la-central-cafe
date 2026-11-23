// Servidor de prueba en el puerto 3998 con una base TEMPORAL (no toca data/lacentral.db).
// Sirve para ver cambios del menú y la caja sin ensuciar las ventas reales.  node app/servidor-prueba.mjs
// En esa base temporal existe el usuario "prueba" (dueño) con el PIN de prueba de abajo. Solo vive aquí.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.LACENTRAL_DB = join(tmpdir(), 'lacentral-vista-previa.db');
process.env.PORT = process.env.PORT || '3998';
const PIN_PRUEBA = '730194';
await import('./server.mjs');
const { db, hashPin } = await import('./db.mjs');
db.prepare(`INSERT INTO usuarios (usuario, nombre, rol, pin_hash, activo) VALUES ('prueba', 'Prueba', 'admin', ?, 1)
  ON CONFLICT(usuario) DO UPDATE SET pin_hash = excluded.pin_hash, rol = 'admin', activo = 1`).run(hashPin(PIN_PRUEBA));
