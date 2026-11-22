// Servidor de prueba en el puerto 3998 con una base TEMPORAL (no toca data/lacentral.db).
// Sirve para ver cambios del menú y la caja sin ensuciar las ventas reales.  node app/servidor-prueba.mjs
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.LACENTRAL_DB = join(tmpdir(), 'lacentral-vista-previa.db');
process.env.PORT = process.env.PORT || '3998';
await import('./server.mjs');
