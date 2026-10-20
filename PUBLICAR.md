# Publicar La Central en internet (menú + caja/comanda en un solo lugar)

Todo este repositorio se publica como **un solo proyecto/servicio** (en Vercel o Render):

| Qué | En Vercel | En Render |
|---|---|---|
| **Menú digital** (clientes con QR / 3D / AR) | `https://TU-APP.vercel.app/` | `https://TU-APP.onrender.com/` |
| **Caja y comanda** (pedidos, ventas, inventario) | `https://TU-APP.vercel.app/caja/` | `https://TU-APP.onrender.com/caja/` |

> En la misma página puedes alternar entre el menú y la caja con los botones integrados en el encabezado y navegación.

## 1. Subir a GitHub
Sube esta carpeta al repositorio `jooosUu/la-central-cafe` (rama `main`).

## 2. Publicar en Vercel (Recomendado para demo/web)
1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu GitHub.
2. Haz clic en **Add New...** → **Project**.
3. Importa el repositorio `la-central-cafe`.
4. En la configuración del proyecto, deja todo por defecto (`vercel.json` se encarga de las rutas automáticamente).
5. Haz clic en **Deploy**. En menos de 1 minuto estará en línea.
   - Accede a `/` para ver el Menú de clientes.
   - Accede a `/caja` o `/comanda` para ver la App de Comandas. En modo demo online usa el PIN `1234`.

## 2. Crear el servicio en Render (una sola vez)
1. Entra a https://render.com e inicia sesión **con tu cuenta de GitHub**.
2. **New +** → **Blueprint** → elige el repo `cafe-lacentral`.
3. Render lee `render.yaml` y te pide 3 valores: **PIN_DUENO**, **PIN_CAJA1**, **PIN_CAJA2** (4 a 8 números cada uno).
4. **Apply**. En unos minutos queda en línea.

Desde ahí, **cada vez que subas cambios a `main`, Render vuelve a publicar solo**.

> El plan con disco persistente es de pago (plan *Starter* + disco de 1 GB; revisa el precio actual en Render).
> El plan gratis **borra las ventas e inventario** cada vez que el servicio se reinicia, por eso no sirve para la caja.

## 3. Después de publicar
- En la caja: **ajustes → códigos QR de las mesas**, pon la dirección `https://TU-SERVICIO.onrender.com/` e imprime.
- Cambia los PIN en **ajustes → cambiar PIN** si quieres.
- Descarga una **copia de seguridad** de vez en cuando (ajustes → descargar copia de seguridad).
  Además se guarda una automática cada día en el disco del servidor.

## Seguir usándolo en el computador
Doble clic en `ABRIR MENU Y CAJA.bat`. Esa versión local usa su propia base de datos (`app/data/lacentral.db`),
separada de la de internet.
