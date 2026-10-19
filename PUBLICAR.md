# Publicar La Central en internet (menú + caja en un solo lugar)

Todo este repositorio se publica como **un solo servicio**:

| Qué | Dirección |
|---|---|
| Menú (lo que abren los clientes con el QR) | `https://TU-SERVICIO.onrender.com/` |
| Caja, inventario y ventas | `https://TU-SERVICIO.onrender.com/caja/` |

## 1. Subir a GitHub
Sube esta carpeta completa al repo `jooosUu/cafe-lacentral` (rama `main`).
Git ya excluye la base de datos, los PIN de prueba y las copias de seguridad.

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
