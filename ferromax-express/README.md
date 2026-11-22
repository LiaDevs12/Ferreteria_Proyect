# FerroMax · Tienda en línea

FerroMax es una tienda de ferretería con catálogo, carrito, cuentas de clientes, historial de pedidos y panel administrativo. Usa Node.js, Express, MySQL o MariaDB y Tailwind CSS.

Los pagos en línea se procesan exclusivamente en **Stripe sandbox**, sin cargos reales.

## Ejecutar en local

Requisitos: Node.js 20.12 o posterior, npm y MySQL o MariaDB.

1. En una base nueva, importa `../database/ferromax.sql` y luego aplica las migraciones de `../database/migrations` en orden. Si ya tienes una base, aplica solo las migraciones que falten. `seed-demo.sql` permite cargar un catálogo de ejemplo.
2. Crea `.env` en `ferromax-express` a partir de `.env.example`. Configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. Usa `GOOGLE_CLIENT_ID` si necesitas iniciar sesión con Google.
3. Desde `ferromax-express`, ejecuta:

   ```bash
   npm ci
   node dbcheck.js
   npm start
   ```

La tienda abre en `http://localhost:3000` por defecto. Para desarrollo, usa `npm run dev`. Para ejecutar las pruebas del cálculo del carrito, usa `npm test`.

## Compras y pagos

- **Stripe Checkout** admite tarjeta, Google Pay y Apple Pay. Stripe muestra las billeteras disponibles según la configuración del sandbox y la compatibilidad del dispositivo.
- **Pago en tienda** usa recogida en sucursal, con envío de $0 y sin pedir domicilio. El pago se realiza en la sucursal.
- En los pedidos a domicilio, FerroMax guarda una copia de la dirección en el pedido y reutiliza la última dirección guardada en `usuarios` para autocompletar futuras compras.
- **Mis pedidos** muestra el estado del pedido y del pago. Los pedidos pendientes en Stripe pueden abrirse para consultar o continuar el pago.
- Al iniciar un pago en Stripe se reserva el inventario. Si se cancela un pedido pendiente o vence su sesión, se devuelve la reserva. Si se cancela un pedido pagado, FerroMax solicita un reembolso de prueba.
- El webhook confirma los pagos. Si falta una notificación, FerroMax puede consultar la sesión en Stripe al abrir el pago. También revisa automáticamente los pedidos que llevan al menos cinco minutos pendientes.

## Stripe sandbox en local

1. Obtén una clave `sk_test_…` del sandbox de FerroMax.
2. Con Stripe CLI autorizada en ese sandbox, ejecuta:

   ```bash
   stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://localhost:3000/api/payments/stripe/webhook
   ```

3. Configura estas variables en tu `.env` local:

   ```env
   STRIPE_SECRET_KEY=sk_test_TU_CLAVE
   STRIPE_WEBHOOK_SECRET=whsec_TU_SECRETO
   STRIPE_RETURN_ORIGIN=http://localhost:3000
   ```

   Usa el secreto `whsec_…` que muestra `stripe listen`. Guarda las claves en tu configuración local, fuera de Git.

4. Deja la CLI abierta, reinicia FerroMax y completa una compra con la tarjeta de prueba `4242 4242 4242 4242`, una fecha futura y cualquier CVC de tres dígitos.

## Despliegue en Railway

- Configura `/ferromax-express` como carpeta raíz del servicio web y `npm start` como comando de inicio.
- Aplica las migraciones pendientes al MySQL de Railway. La `002_stripe_checkout.sql` agrega los datos de Stripe a `pedidos`. La `003_entrega_y_direccion_cliente.sql` agrega el tipo de entrega y permite pedidos de sucursal sin domicilio.
- En las variables del servicio web, configura `STRIPE_SECRET_KEY` con la clave de prueba y `STRIPE_RETURN_ORIGIN` con el origen público HTTPS de la tienda.
- En el sandbox de Stripe, registra el endpoint `https://tu-dominio/api/payments/stripe/webhook` para `checkout.session.completed` y `checkout.session.expired`. Usa el secreto de firma de ese destino como `STRIPE_WEBHOOK_SECRET` en Railway.
- Verifica que Stripe muestre `HTTP 200` en la entrega del evento y que el pedido aparezca como **Pagado en Stripe (prueba)**. Stripe entrega los eventos directamente a Railway.

## Rutas principales

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | Comprueba la conexión con MySQL |
| GET | `/api/products` | Lista y filtra productos |
| GET | `/api/products/:id` | Consulta un producto |
| GET | `/api/categories` | Lista categorías |
| POST | `/api/pricing` | Calcula el subtotal, el envío y el total |
| POST | `/api/orders` | Registra un pedido y devuelve el enlace de Stripe cuando corresponde |
| GET | `/api/orders` | Lista los pedidos de la cuenta |
| GET | `/api/orders/shipping-address` | Devuelve la dirección guardada de la cuenta |
| GET | `/api/orders/:id/payment` | Consulta el estado del pago en Stripe |
| POST | `/api/orders/:id/cancel` | Cancela un pedido dentro del plazo permitido |
| POST | `/api/payments/stripe/webhook` | Recibe eventos firmados de Stripe |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/google` | Registro e inicio de sesión |
| GET | `/api/auth/me` | Consulta la sesión actual |
| POST | `/api/auth/logout` | Cierra la sesión |

## Estructura

- `server.js` arranca Express y conecta las rutas de la tienda y el panel.
- `src/storefront/` contiene catálogo, autenticación, pedidos e integración con Stripe.
- `src/admin/` contiene las rutas del panel administrativo.
- `public/` contiene la interfaz de la tienda y del panel.
- `pricing.js` calcula los importes del carrito en el servidor.

## Autenticación

Los clientes pueden registrarse e iniciar sesión con contraseña o con Google. Las contraseñas se guardan con bcrypt. Las sesiones de tienda y administración son independientes y usan cookies `HttpOnly`. Se almacenan en memoria, por lo que un reinicio del servidor cierra las sesiones activas.

## Pendiente

- Probar Apple Pay de punta a punta en un iPhone.
- Verificar la revisión automática de pagos en una prueba aislada, sin abrir el detalle del pago.
- Implementar la recuperación de contraseña por correo.