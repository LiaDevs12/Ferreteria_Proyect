# Ferremax – sitio para clientes (demo) · Node.js + Express + Tailwind CSS

**Todo es demostrativo**: sin cobros reales, sin autenticación real, datos de ejemplo.

## Ejecutar
```bash
npm install
npm start          # compila Tailwind y levanta http://localhost:3000
npm test           # pruebas del cálculo de carrito (node:test)
```
Desarrollo: `npm run dev`. Puerto configurable con `PORT` (ver `.env.example`).

## Estructura
- `server.js` API REST + archivos estáticos · `data.js` productos/categorías de demo (único punto a sustituir por la BD o API del módulo admin) · `pricing.js` cálculo de carrito (el servidor recalcula precios y existencias).
- `public/` frontend (HTML + JS + Tailwind): `index.html` (base), `app.js` (rutas, datos y carrito), `ui.js` (iconos, cabecera, hero, franjas y pie de página; **aquí se reemplazan los datos de contacto demostrativos**) · `src/input.css` entrada de Tailwind (botones, tarjetas, tokens de marca en `tailwind.config.js`).

## Endpoints (contrato propuesto; acordar con quien desarrolla el módulo admin)
| Método | Ruta | Notas |
|---|---|---|
| GET | /api/products?q&categoryId&brand&maxPrice&sort | sort: precio-asc, precio-desc, nombre |
| GET | /api/products/:id | |
| GET | /api/categories | |
| POST | /api/pricing | `{lines:[{productId,quantity}]}` → totales calculados en servidor |
| POST | /api/orders | valida datos y recalcula; pedido de demo con `paymentStatus: pendiente_de_integracion` |
| GET | /api/orders | pedidos de la sesión actual (demo en memoria) |
| POST | /api/auth/demo-login · /logout · GET /me | solo usuario de prueba |
| POST | /api/auth/register · login · recover | 501: pendientes de integración |
| POST | /api/payments/session | 501: el backend crea la sesión de pago y confirma por webhook |

Por acordar: base de datos, autenticación (cookies/JWT), estados de pedido, paginación, IDs.

## Pendiente
Autenticación real, base de datos, pasarela de pagos, imágenes reales, pruebas de interfaz.

## Base de datos (MySQL/MariaDB `ferromax`)
Configura `.env` (ver `.env.example`; no se sube a GitHub). `node dbcheck.js` prueba la conexión. `seed-demo.sql` carga productos de demostración (ejecutar una vez).
Los pedidos se guardan en `pedidos`/`detalle_pedido` con `observaciones` que empiezan con "PEDIDO DE DEMOSTRACIÓN" y estado `PENDIENTE`; `id_usuario` es el usuario de prueba `prueba@ejemplo.com` (sin acceso real).
Quitar datos demo: `DELETE FROM detalle_pedido; DELETE FROM pedidos WHERE observaciones LIKE 'PEDIDO DE DEMOSTRACIÓN%';` (primero detalle de esos pedidos) y `DELETE FROM productos WHERE sku LIKE 'DEMO-%';`.
Por acordar con el módulo admin: campo de estado de pago en `pedidos` (hoy no existe), autenticación real/hash de contraseñas, imágenes.

## Autenticación
Registro e inicio de sesión con contraseña (hash bcrypt en `usuarios.password_hash`, rol CLIENTE, fila en `clientes`) y con Google (token verificado en el servidor con `GOOGLE_CLIENT_ID`). Sesión por cookie HttpOnly en memoria del servidor (se pierde al reiniciar). Pendiente: recuperación de contraseña (requiere correo), sesiones persistentes, `Secure` en producción.
Por acordar con el módulo admin: formato de `password_hash` (aquí bcrypt `$2…`); las cuentas de Google guardan el marcador `!GOOGLE`.
