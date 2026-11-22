import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';

export const moneda = 'mxn';
export const centavos = importe => Math.round(Number(importe) * 100);
export const motivoReserva = id => `Reserva Stripe PED-${id}`;

export function configurarStripe(env = process.env) {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_RETURN_ORIGIN } = env;
    if (!STRIPE_SECRET_KEY && !STRIPE_WEBHOOK_SECRET && !STRIPE_RETURN_ORIGIN) return null;

    if (!/^(sk|rk)_test_\S+$/.test(STRIPE_SECRET_KEY || '')) {
        throw new Error('STRIPE_SECRET_KEY debe ser una clave de prueba de Stripe.');
    }

    const origen = new URL(STRIPE_RETURN_ORIGIN || 'http://localhost:3000');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname);
    if (
        (origen.protocol !== 'https:' && !(local && origen.protocol === 'http:')) ||
        origen.username || origen.password || origen.pathname !== '/' || origen.search || origen.hash ||
        !/^whsec_\S+$/.test(STRIPE_WEBHOOK_SECRET || '')
    ) {
        throw new Error('Configura STRIPE_WEBHOOK_SECRET y un origen HTTPS o localhost para Stripe.');
    }

    return {
        cliente: new Stripe(STRIPE_SECRET_KEY, { timeout: 5000, maxNetworkRetries: 0 }),
        secretoWebhook: STRIPE_WEBHOOK_SECRET,
        origen: origen.origin
    };
}

export async function crearSesionStripe(stripe, pedidoId, email, total) {
    const folio = `PED-${pedidoId}`;
    const retorno = `${stripe.origen}/#/pago/${pedidoId}`;
    const lineItems = total.items
        .filter(item => centavos(item.unitPrice) > 0)
        .map(item => ({
            quantity: item.quantity,
            price_data: {
                currency: moneda,
                unit_amount: centavos(item.unitPrice),
                product_data: { name: item.name }
            }
        }));

    if (total.shipping > 0) {
        lineItems.push({
            quantity: 1,
            price_data: {
                currency: moneda,
                unit_amount: centavos(total.shipping),
                product_data: { name: 'Envío FerroMax' }
            }
        });
    }

    const sesion = await stripe.cliente.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: lineItems,
        client_reference_id: folio,
        success_url: retorno,
        cancel_url: retorno,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60
    }, { idempotencyKey: `ferromax-checkout-${randomUUID()}` });

    if (!sesion.url || sesion.livemode !== false || !coincideSesion(sesion, pedidoId, total.total)) {
        throw new Error('Stripe devolvió una sesión de pago inesperada.');
    }

    return sesion;
}

function coincideSesion(sesion, pedidoId, total) {
    return sesion.client_reference_id === `PED-${pedidoId}` &&
        sesion.currency === moneda &&
        sesion.amount_total === centavos(total);
}

export async function devolverReserva(conexion, pedido, motivo) {
    const [detalles] = await conexion.query(
        'SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_producto',
        [pedido.id_pedido]
    );
    if (!detalles.length) throw new Error('No se encontraron productos para liberar la reserva.');

    for (const { id_producto, cantidad } of detalles) {
        const [actualizado] = await conexion.query(
            'UPDATE existencias SET existencia_actual = existencia_actual + ? WHERE id_producto = ?',
            [cantidad, id_producto]
        );
        if (actualizado.affectedRows !== 1) throw new Error('No se pudo liberar la reserva de Stripe.');

        await conexion.query(
            `INSERT INTO movimientos_inventario (id_producto, id_usuario, tipo_movimiento, cantidad, motivo)
             VALUES (?, ?, 'ENTRADA', ?, ?)`,
            [id_producto, pedido.id_usuario, cantidad, motivo]
        );
    }
}

export async function reconciliarSesionStripe(pool, sesion) {
    if (sesion.livemode !== false) {
        throw new Error('La sesión de Stripe debe ser de prueba.');
    }

    const pagado = sesion.status === 'complete' &&
        sesion.payment_status === 'paid';
    const expirado = sesion.status === 'expired';

    if (!pagado && !expirado) return null;

    let conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [[pedido]] = await conexion.query(
            `SELECT id_pedido, id_usuario, stripe_estado, total
             FROM pedidos
             WHERE stripe_session_id = ?
             FOR UPDATE`,
            [sesion.id]
        );

        if (!pedido) {
            await conexion.commit();
            return null;
        }

        if (!coincideSesion(sesion, pedido.id_pedido, pedido.total)) {
            throw new Error('La sesión de Stripe no coincide con el folio o el importe del pedido.');
        }

        if (pedido.stripe_estado !== 'PENDIENTE') {
            await conexion.commit();
            return pedido.stripe_estado;
        }

        if (expirado) {
            await devolverReserva(
                conexion,
                pedido,
                `Expiración Stripe PED-${pedido.id_pedido}`
            );
        }

        const estadoPedido = pagado ? 'CONFIRMADO' : 'CANCELADO';
        const estadoPago = pagado ? 'PAGADO' : 'EXPIRADO';

        await conexion.query(
            'UPDATE pedidos SET estado = ?, stripe_estado = ? WHERE id_pedido = ?',
            [estadoPedido, estadoPago, pedido.id_pedido]
        );

        await conexion.commit();
        return estadoPago;
    } catch (error) {
        try {
            await conexion.rollback();
        } catch {
            conexion.destroy();
            conexion = null;
        }

        throw error;
    } finally {
        conexion?.release();
    }
}

export function webhookStripe(stripe, pool) {
    const eventosDeCheckout = new Set([
        'checkout.session.completed',
        'checkout.session.expired',
        'checkout.session.async_payment_succeeded'
    ]);

    return async (req, res) => {
        if (!stripe) return res.sendStatus(503);

        let evento;

        try {
            evento = stripe.cliente.webhooks.constructEvent(
                req.body,
                req.get('Stripe-Signature'),
                stripe.secretoWebhook
            );
        } catch {
            return res.sendStatus(400);
        }

        if (evento.livemode !== false) return res.sendStatus(400);
        if (!eventosDeCheckout.has(evento.type)) return res.sendStatus(200);

        const sesion = evento.data.object;
        if (sesion.livemode !== false) return res.sendStatus(400);

        try {
            await reconciliarSesionStripe(pool, sesion);
            return res.sendStatus(200);
        } catch (error) {
            console.error('Error al procesar webhook Stripe:', error.message);
            return res.sendStatus(500);
        }
    };
}
export function iniciarRevisionPagosStripe(stripe, pool) {
    if (!stripe) return;

    const tamanoLote = 20;
    let ultimoId = 0;
    let revisando = false;

    async function revisar() {
        if (revisando) return;
        revisando = true;

        try {
            const [pedidos] = await pool.query(
                `SELECT id_pedido, stripe_session_id
                 FROM pedidos
                 WHERE stripe_estado = 'PENDIENTE'
                   AND stripe_session_id IS NOT NULL
                   AND fecha_pedido <= NOW() - INTERVAL 5 MINUTE
                   AND id_pedido > ?
                 ORDER BY id_pedido
                 LIMIT ?`,
                [ultimoId, tamanoLote]
            );

            for (const pedido of pedidos) {
                ultimoId = pedido.id_pedido;

                try {
                    const sesion = await stripe.cliente.checkout.sessions.retrieve(
                        pedido.stripe_session_id
                    );
                    await reconciliarSesionStripe(pool, sesion);
                } catch (error) {
                    console.error(
                        `Error al revisar el pago del PED-${pedido.id_pedido}:`,
                        error.code || error.type || error.name
                    );
                }
            }

            if (pedidos.length < tamanoLote) ultimoId = 0;
        } catch (error) {
            console.error('Error al buscar pagos pendientes:', error.code || error.name);
        } finally {
            revisando = false;
        }
    }

    const intervalo = setInterval(revisar, 60_000);
    intervalo.unref();
    void revisar();
}