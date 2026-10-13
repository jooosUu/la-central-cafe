# La Central · caja, inventario y menú

## Encenderlo
Doble clic en **`ABRIR MENU Y CAJA.bat`** (carpeta principal). Se abre la caja en el navegador.
Deja la ventana negra abierta mientras atiendes; cerrarla apaga la caja y el menú.

| Qué | Dirección en este computador | Desde otro celular/tablet en el mismo WiFi |
|---|---|---|
| Caja | http://localhost:3000/caja/ | http://IP-DEL-PC:3000/caja/ |
| Menú | http://localhost:3000/ | http://IP-DEL-PC:3000/ |

La IP del PC sale con `ipconfig` ("Dirección IPv4"). La primera vez Windows puede preguntar
si permite a Node en la red: acepta solo para **redes privadas**.

## Usuarios
- 3 usuarios: **Dueño** (admin) y **Caja 1 / Caja 2** (cajeros).
- Los PIN iniciales de prueba están en `data/usuarios-iniciales.json`.
  Cámbialos en **ajustes → cambiar PIN** y luego borra ese archivo.

| | Dueño | Cajero |
|---|---|---|
| Vender, registrar compras/conteos/mermas | sí | sí |
| Ver reportes de ventas | sí | sí (sin costos ni ganancia) |
| Anular ventas, cambiar precios, recetas, insumos | sí | no |

## Cómo funciona el inventario
Cada producto tiene una **receta** (ajustes → receta). Al vender, se descuentan sus insumos:
un Choripán descuenta 1 pan + 1 chorizo + 1 chimichurri; el combo además 1 papa criolla + 1 Coca-Cola Zero.
- **+ compra**: cuando llega mercancía (si pones el costo total, se actualiza el costo unitario).
- **contar**: escribes lo que hay físicamente y el sistema se ajusta.
- **merma**: algo dañado, vencido o regalado.

El menú digital lee los precios de la caja y marca **agotado** cuando no alcanza el inventario.

> Los insumos, cantidades y costos iniciales son **valores de prueba**: ajústalos con los reales.

## Copia de seguridad
Todo queda en `data/lacentral.db`. Copia ese archivo (con la caja apagada) a una USB o a la nube.

## Pruebas
```
LACENTRAL_DB=/tmp/prueba.db PORT=3999 node server.mjs
node test.mjs http://localhost:3999
```
