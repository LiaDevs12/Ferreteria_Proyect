
import { pool } from '../../db.js';
import { priceCart } from '../../pricing.js';

const s = valor => String(valor ?? '').trim();

const emailValido = valor =>
    /^\S+@\S+\.\S+$/.test(s(valor));

const PAGO = {
    tarjeta: 'TARJETA',
    transferencia: 'TRANSFERENCIA',
    tienda: 'EFECTIVO'
};

const ESTADOS = {
    PENDIENTE: 'Pendiente',
    CONFIRMADO: 'Confirmado',
    PREPARANDO: 'En preparación',
    ENVIADO: 'Enviado',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado'
};

const CANCELABLES = new Set([
    'PENDIENTE',
    'CONFIRMADO',
    'PREPARANDO'
]);

const HORAS_CANCELACION = 12;
const TIEMPO_BLOQUEO = 5;

function crearError(estado, mensaje) {
    const error = new Error(mensaje);
    error.status = estado;
    return error;
}

function esErrorBloqueo(error) {
    return (
        error?.code === 'ER_LOCK_WAIT_TIMEOUT' ||
        error?.code === 'ER_LOCK_DEADLOCK' ||
        error?.errno === 1205 ||
        error?.errno === 1213
    );
}

function normalizarError(error) {
    if (esErrorBloqueo(error)) {
        return crearError(
            409,
            'El inventario está siendo actualizado. Intenta nuevamente.'
        );
    }

    return error;
}

async function iniciarTransaccion(conexion) {
    const [[configuracion]] = await conexion.query(
        'SELECT @@session.innodb_lock_wait_timeout AS tiempo'
    );

    const tiempoOriginal = Number(configuracion.tiempo);

    await conexion.query(
        'SET SESSION innodb_lock_wait_timeout = ?',
        [TIEMPO_BLOQUEO]
    );

    try {
        await conexion.beginTransaction();
    } catch (error) {
        await conexion.query(
            'SET SESSION innodb_lock_wait_timeout = ?',
            [tiempoOriginal]
        ).catch(() => {});

        throw error;
    }

    return tiempoOriginal;
}

async function cerrarConexion(conexion, tiempoOriginal) {
    if (!conexion) return;

    if (tiempoOriginal !== null) {
        try {
            await conexion.query(
                'SET SESSION innodb_lock_wait_timeout = ?',
                [tiempoOriginal]
            );
        } catch {
            conexion.destroy();
            return;
        }
    }

    conexion.release();
}

function motivoDeCancelacion(observaciones, estado) {
    if (s(estado).toUpperCase() !== 'CANCELADO') {
        return '';
    }

    const notas = s(observaciones);

    const anterior = notas.match(
        /^CANCELADO POR CLIENTE\s*\|\s*MOTIVO:\s*(.*?)\s*\|\s*FECHA:/i
    );

    if (anterior) {
        return anterior[1].trim();
    }

    if (
        /^(PEDIDO DE DEMOSTRACI[ÓO]N|PAGO SIMULADO|PAGO PENDIENTE)/i
            .test(notas)
    ) {
        return '';
    }

    return notas;
}

function respuestaPedido(pedido, detalles = []) {
    const codigo = s(pedido.estado).toUpperCase();
    const segundos = Number(pedido.segundosRestantes);

    const restantes = Number.isFinite(segundos)
        ? segundos
        : -1;

    const metodo = s(pedido.metodo_pago).toUpperCase();

    const notas = s(pedido.observaciones);

    return {
        id: `PED-${pedido.id_pedido}`,
        createdAt: pedido.fecha_pedido,
        total: Number(pedido.total),

        status: ESTADOS[codigo] || codigo,
        statusCode: codigo,

        paymentStatus:
            codigo === 'CANCELADO'
                ? 'cancelado'
                : metodo === 'TARJETA' ||
                  notas.includes('PAGO SIMULADO APROBADO')
                    ? 'simulado_aprobado'
                    : 'pendiente_de_integracion',

        canCancel:
            CANCELABLES.has(codigo) &&
            restantes > 0,

        secondsToCancel: Math.max(0, restantes),

        cancelReason: motivoDeCancelacion(
            notas,
            codigo
        ),

        items: detalles.map(detalle => ({
            name: detalle.nombre,
            quantity: Number(detalle.cantidad),
            subtotal: Number(detalle.subtotal)
        }))
    };
}

export function registrarPedidos(api, { load } = {}) {
    if (typeof load !== 'function') {
        throw new Error(
            'registrarPedidos requiere la función load.'
        );
    }

    // ==========================================
    // CREAR PEDIDO
    // ==========================================

    api.post('/orders', async (req, res, next) => {
        const usuarioId = Number(req.s?.user?.id);

        if (
            !Number.isSafeInteger(usuarioId) ||
            usuarioId <= 0
        ) {
            return res.status(401).json({
                error: 'Debes iniciar sesión para crear un pedido.'
            });
        }

        const {
            customer = {},
            address = {},
            delivery,
            paymentMethod,
            lines
        } = req.body || {};

        const camposInvalidos = [];

        if (s(customer?.name).length < 3) {
            camposInvalidos.push('name');
        }

        if (!emailValido(customer?.email)) {
            camposInvalidos.push('email');
        }

        for (const campo of [
            'calle',
            'numeroExterior',
            'colonia',
            'codigoPostal',
            'ciudad',
            'estado'
        ]) {
            if (!s(address?.[campo])) {
                camposInvalidos.push(campo);
            }
        }

        if (!/^\d{5}$/.test(s(address?.codigoPostal))) {
            camposInvalidos.push('codigoPostal');
        }

        if (
            !Object.prototype.hasOwnProperty.call(
                PAGO,
                paymentMethod
            )
        ) {
            camposInvalidos.push('paymentMethod');
        }

        if (
            !['domicilio', 'sucursal'].includes(delivery)
        ) {
            camposInvalidos.push('delivery');
        }

        if (
            !Array.isArray(lines) ||
            lines.length === 0 ||
            lines.length > 50
        ) {
            camposInvalidos.push('lines');
        }

        if (camposInvalidos.length > 0) {
            return res.status(400).json({
                error: 'Revisa los datos del pedido.',
                fields: [...new Set(camposInvalidos)]
            });
        }

        // ======================================
        // VALIDAR PRODUCTOS
        // ======================================

        const solicitadas = new Map();

        for (const linea of lines) {
            const id = Number(linea?.productId);
            const cantidad = Number(linea?.quantity);

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                !Number.isSafeInteger(cantidad) ||
                cantidad <= 0 ||
                solicitadas.has(id)
            ) {
                return res.status(400).json({
                    error:
                        'El carrito contiene productos duplicados o cantidades inválidas.'
                });
            }

            solicitadas.set(id, cantidad);
        }

        const tarjeta = paymentMethod === 'tarjeta';

        let conexion;
        let tiempoOriginal = null;
        let transaccionActiva = false;

        try {
            conexion = await pool.getConnection();

            tiempoOriginal = await iniciarTransaccion(
                conexion
            );

            transaccionActiva = true;

            const productos = [];

            const ordenados = [
                ...solicitadas.entries()
            ].sort((a, b) => a[0] - b[0]);

            // ==================================
            // CONSULTAR PRODUCTOS E INVENTARIO
            // ==================================

            for (const [id, cantidad] of ordenados) {
                const [[producto]] = await conexion.query(
                    `
                    SELECT
                        id_producto AS id,
                        nombre AS name,
                        precio AS price,
                        activo,
                        unidad_venta AS unit
                    FROM productos
                    WHERE id_producto = ?
                    `,
                    [id]
                );

                if (
                    !producto ||
                    Number(producto.activo) !== 1
                ) {
                    throw crearError(
                        409,
                        `El producto ${id} no está disponible.`
                    );
                }

                // Bloquear solamente el registro
                // de inventario que se actualizará.

                const [existencias] = await conexion.query(
                    `
                    SELECT existencia_actual AS stock
                    FROM existencias
                    WHERE id_producto = ?
                    FOR UPDATE
                    `,
                    [id]
                );

                if (existencias.length !== 1) {
                    throw crearError(
                        409,
                        `No se encontró inventario para ${producto.name}.`
                    );
                }

                const stock = Number(
                    existencias[0].stock
                );

                if (
                    !Number.isFinite(stock) ||
                    stock < cantidad
                ) {
                    throw crearError(
                        409,
                        `No hay existencias suficientes de ${producto.name}.`
                    );
                }

                productos.push({
                    id: String(producto.id),
                    name: producto.name,
                    price: Number(producto.price),
                    unit: producto.unit,
                    stock
                });
            }

            // ==================================
            // RECALCULAR IMPORTE
            // ==================================

            const total = priceCart(
                lines,
                productos
            );

            if (
                !total ||
                !Array.isArray(total.items) ||
                total.items.length !== solicitadas.size
            ) {
                throw crearError(
                    409,
                    'No se pudo verificar el contenido del carrito.'
                );
            }

            const cantidadesIncorrectas =
                total.items.some(item => {
                    const id = Number(item.productId);
                    const cantidad = Number(item.quantity);

                    return (
                        !solicitadas.has(id) ||
                        cantidad !== solicitadas.get(id)
                    );
                });

            if (cantidadesIncorrectas) {
                throw crearError(
                    409,
                    'Los precios, cantidades o existencias cambiaron. Revisa el carrito.'
                );
            }

            if (
                !Number.isFinite(Number(total.total)) ||
                Number(total.total) < 0
            ) {
                throw crearError(
                    400,
                    'El importe del pedido es inválido.'
                );
            }

            // ==================================
            // REGISTRAR PEDIDO
            // ==================================

            const estado = tarjeta
                ? 'CONFIRMADO'
                : 'PENDIENTE';

            const observaciones = '';

            const [creado] = await conexion.query(
                `
                INSERT INTO pedidos (
                    id_usuario,
                    subtotal,
                    costo_envio,
                    total,
                    estado,
                    metodo_pago,
                    observaciones,
                    domicilio_calle,
                    domicilio_numero_exterior,
                    domicilio_numero_interior,
                    domicilio_colonia,
                    domicilio_codigo_postal,
                    domicilio_ciudad,
                    domicilio_estado,
                    domicilio_referencias
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?
                )
                `,
                [
                    usuarioId,
                    total.subtotal,
                    total.shipping,
                    total.total,
                    estado,
                    PAGO[paymentMethod],
                    observaciones,
                    s(address.calle),
                    s(address.numeroExterior),
                    s(address.numeroInterior) || null,
                    s(address.colonia),
                    s(address.codigoPostal),
                    s(address.ciudad),
                    s(address.estado),
                    s(address.referencias) || null
                ]
            );

            const pedidoId = creado.insertId;

            // ==================================
            // GUARDAR DETALLES DEL PEDIDO
            // ==================================

            for (const item of [...total.items].sort(
                (a, b) =>
                    Number(a.productId) -
                    Number(b.productId)
            )) {
                const id = Number(item.productId);
                const cantidad = Number(item.quantity);

                await conexion.query(
                    `
                    INSERT INTO detalle_pedido (
                        id_pedido,
                        id_producto,
                        cantidad,
                        precio_unitario,
                        subtotal
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        pedidoId,
                        id,
                        cantidad,
                        item.unitPrice,
                        item.subtotal
                    ]
                );
            }

            // ==================================
            // DESCONTAR INVENTARIO
            // ==================================

            if (tarjeta) {
                for (const [id, cantidad] of ordenados) {
                    const [actualizado] =
                        await conexion.query(
                            `
                            UPDATE existencias
                            SET existencia_actual =
                                existencia_actual - ?
                            WHERE id_producto = ?
                              AND existencia_actual >= ?
                            `,
                            [
                                cantidad,
                                id,
                                cantidad
                            ]
                        );

                    if (actualizado.affectedRows !== 1) {
                        throw crearError(
                            409,
                            `Stock insuficiente para el producto ${id}.`
                        );
                    }

                    // Registrar movimiento de salida.

                    await conexion.query(
                        `
                        INSERT INTO movimientos_inventario (
                            id_producto,
                            id_usuario,
                            tipo_movimiento,
                            cantidad,
                            motivo
                        )
                        VALUES (?, ?, 'SALIDA', ?, ?)
                        `,
                        [
                            id,
                            usuarioId,
                            cantidad,
                            `Pedido PED-${pedidoId} · pago simulado`
                        ]
                    );
                }
            }

            // ==================================
            // CONFIRMAR TODAS LAS OPERACIONES
            // ==================================

            await conexion.commit();
            transaccionActiva = false;

            return res.status(201).json({
                ...respuestaPedido(
                    {
                        id_pedido: pedidoId,
                        fecha_pedido: new Date(),
                        total: total.total,
                        estado,
                        metodo_pago: PAGO[paymentMethod],
                        observaciones,
                        segundosRestantes:
                            HORAS_CANCELACION * 60 * 60
                    },
                    total.items.map(item => ({
                        nombre: item.name,
                        cantidad: item.quantity,
                        subtotal: item.subtotal
                    }))
                ),
                stockUpdated: tarjeta
            });

        } catch (error) {
            if (conexion && transaccionActiva) {
                try {
                    await conexion.rollback();
                    transaccionActiva = false;
                } catch (rollbackError) {
                    console.error(
                        'Error al revertir el pedido:',
                        rollbackError
                    );

                    conexion.destroy();
                    conexion = null;
                }
            }

            console.error(
                'Error al crear pedido:',
                error
            );

            next(normalizarError(error));

        } finally {
            await cerrarConexion(
                conexion,
                tiempoOriginal
            );
        }
    });

    // ==========================================
    // LISTAR PEDIDOS DEL CLIENTE
    // ==========================================

    api.get('/orders', async (req, res, next) => {
        const usuarioId = Number(req.s?.user?.id);

        if (
            !Number.isSafeInteger(usuarioId) ||
            usuarioId <= 0
        ) {
            return res.json([]);
        }

        try {
            const [pedidos] = await pool.query(
                `
                SELECT
                    id_pedido,
                    fecha_pedido,
                    total,
                    estado,
                    metodo_pago,
                    observaciones,

                    TIMESTAMPDIFF(
                        SECOND,
                        NOW(),
                        DATE_ADD(
                            fecha_pedido,
                            INTERVAL 12 HOUR
                        )
                    ) AS segundosRestantes

                FROM pedidos

                WHERE id_usuario = ?

                ORDER BY
                    fecha_pedido DESC,
                    id_pedido DESC
                `,
                [usuarioId]
            );

            if (!pedidos.length) {
                return res.json([]);
            }

            const [detalles] = await pool.query(
                `
                SELECT
                    d.id_pedido,
                    d.cantidad,
                    d.subtotal,

                    COALESCE(
                        p.nombre,
                        'Producto no disponible'
                    ) AS nombre

                FROM detalle_pedido d

                LEFT JOIN productos p
                    ON p.id_producto = d.id_producto

                WHERE d.id_pedido IN (?)

                ORDER BY
                    d.id_pedido DESC,
                    d.id_producto
                `,
                [
                    pedidos.map(
                        pedido => pedido.id_pedido
                    )
                ]
            );

            const porPedido = new Map();

            for (const detalle of detalles) {
                const clave = String(
                    detalle.id_pedido
                );

                if (!porPedido.has(clave)) {
                    porPedido.set(clave, []);
                }

                porPedido.get(clave).push(detalle);
            }

            const resultado = pedidos.map(pedido =>
                respuestaPedido(
                    pedido,
                    porPedido.get(
                        String(pedido.id_pedido)
                    ) || []
                )
            );

            return res.json(resultado);

        } catch (error) {
            console.error(
                'Error al consultar pedidos:',
                error
            );

            next(normalizarError(error));
        }
    });

    // ==========================================
    // CANCELAR PEDIDO
    // ==========================================

    api.post(
        '/orders/:id/cancel',
        async (req, res, next) => {
            const usuarioId = Number(
                req.s?.user?.id
            );

            const pedidoId = Number(
                req.params.id
            );

            const motivo = s(
                req.body?.motivo
            );

            if (
                !Number.isSafeInteger(usuarioId) ||
                usuarioId <= 0
            ) {
                return res.status(401).json({
                    error:
                        'Inicia sesión para cancelar un pedido.'
                });
            }

            if (
                !Number.isSafeInteger(pedidoId) ||
                pedidoId <= 0
            ) {
                return res.status(400).json({
                    error: 'Folio de pedido inválido.'
                });
            }

            if (
                motivo.length < 10 ||
                motivo.length > 200
            ) {
                return res.status(400).json({
                    error:
                        'El motivo debe tener entre 10 y 200 caracteres.'
                });
            }

            let conexion;
            let tiempoOriginal = null;
            let transaccionActiva = false;

            try {
                conexion = await pool.getConnection();

                tiempoOriginal = await iniciarTransaccion(
                    conexion
                );

                transaccionActiva = true;

                // ==================================
                // BLOQUEAR PEDIDO
                // ==================================

                const [[pedido]] =
                    await conexion.query(
                        `
                        SELECT
                            id_pedido,
                            id_usuario,
                            estado,
                            metodo_pago,
                            observaciones,

                            (
                                NOW() >= fecha_pedido
                                AND
                                NOW() < DATE_ADD(
                                    fecha_pedido,
                                    INTERVAL 12 HOUR
                                )
                            ) AS enPlazo

                        FROM pedidos

                        WHERE id_pedido = ?

                        FOR UPDATE
                        `,
                        [pedidoId]
                    );

                if (
                    !pedido ||
                    Number(pedido.id_usuario) !==
                        usuarioId
                ) {
                    throw crearError(
                        404,
                        'Pedido no encontrado en tu cuenta.'
                    );
                }

                if (!Number(pedido.enPlazo)) {
                    throw crearError(
                        409,
                        'El plazo de 12 horas para cancelar este pedido terminó.'
                    );
                }

                const estadoActual = s(
                    pedido.estado
                ).toUpperCase();

                if (!CANCELABLES.has(estadoActual)) {
                    throw crearError(
                        409,
                        'Este pedido ya no puede cancelarse por su estado actual.'
                    );
                }

                // ==================================
                // CONSULTAR DETALLES
                // ==================================

                const [detalles] =
                    await conexion.query(
                        `
                        SELECT
                            id_producto,
                            cantidad

                        FROM detalle_pedido

                        WHERE id_pedido = ?

                        ORDER BY id_producto
                        `,
                        [pedidoId]
                    );

                if (!detalles.length) {
                    throw crearError(
                        409,
                        'El pedido no contiene productos.'
                    );
                }

                // ==================================
                // CONSULTAR MOVIMIENTOS DE SALIDA
                // ==================================

                const [salidas] =
                    await conexion.query(
                        `
                        SELECT
                            id_producto,
                            SUM(cantidad) AS cantidad

                        FROM movimientos_inventario

                        WHERE tipo_movimiento = 'SALIDA'
                          AND motivo = ?

                        GROUP BY id_producto

                        ORDER BY id_producto
                        `,
                        [
                            `Pedido PED-${pedidoId} · pago simulado`
                        ]
                    );

                // ==================================
                // EVITAR DEVOLUCIONES DUPLICADAS
                // ==================================

                const [devolucionesPrevias] =
                    await conexion.query(
                        `
                        SELECT COUNT(*) AS total

                        FROM movimientos_inventario

                        WHERE tipo_movimiento = 'ENTRADA'
                          AND motivo = ?
                        `,
                        [
                            `Devolución por cancelación PED-${pedidoId}`
                        ]
                    );

                if (
                    Number(
                        devolucionesPrevias[0].total
                    ) > 0
                ) {
                    throw crearError(
                        409,
                        'Este pedido ya tuvo una devolución de inventario.'
                    );
                }

                const esTarjeta =
                    s(pedido.metodo_pago)
                        .toUpperCase() === 'TARJETA';

                if (esTarjeta && !salidas.length) {
                    throw crearError(
                        409,
                        'No se pudieron verificar los descuentos de inventario de este pedido.'
                    );
                }

                if (!esTarjeta && salidas.length) {
                    throw crearError(
                        409,
                        'Los movimientos no coinciden con el método de pago registrado.'
                    );
                }

                // ==================================
                // VALIDAR CANTIDADES
                // ==================================

                if (salidas.length) {
                    const esperadas = new Map();

                    for (const item of detalles) {
                        const id = Number(
                            item.id_producto
                        );

                        const cantidad = Number(
                            item.cantidad
                        );

                        esperadas.set(
                            id,
                            (esperadas.get(id) || 0) +
                                cantidad
                        );
                    }

                    const coinciden =
                        salidas.length ===
                            esperadas.size &&

                        salidas.every(item => {
                            const id = Number(
                                item.id_producto
                            );

                            const cantidad = Number(
                                item.cantidad
                            );

                            return (
                                Number.isSafeInteger(id) &&
                                Number.isSafeInteger(cantidad) &&
                                cantidad > 0 &&
                                cantidad === esperadas.get(id)
                            );
                        });

                    if (!coinciden) {
                        throw crearError(
                            409,
                            'Los movimientos de inventario no coinciden con los productos del pedido.'
                        );
                    }

                    // ==============================
                    // DEVOLVER INVENTARIO
                    // ==============================

                    for (const salida of salidas) {
                        const productoId = Number(
                            salida.id_producto
                        );

                        const cantidad = Number(
                            salida.cantidad
                        );

                        const [actualizado] =
                            await conexion.query(
                                `
                                UPDATE existencias

                                SET existencia_actual =
                                    existencia_actual + ?

                                WHERE id_producto = ?
                                `,
                                [
                                    cantidad,
                                    productoId
                                ]
                            );

                        if (
                            actualizado.affectedRows !== 1
                        ) {
                            throw crearError(
                                409,
                                `No se pudo reintegrar el inventario del producto ${productoId}.`
                            );
                        }

                        // Registrar devolución.

                        await conexion.query(
                            `
                            INSERT INTO movimientos_inventario (
                                id_producto,
                                id_usuario,
                                tipo_movimiento,
                                cantidad,
                                motivo
                            )
                            VALUES (
                                ?, ?, 'ENTRADA', ?, ?
                            )
                            `,
                            [
                                productoId,
                                usuarioId,
                                cantidad,
                                `Devolución por cancelación PED-${pedidoId}`
                            ]
                        );
                    }
                }

                // ==================================
                // ACTUALIZAR ESTADO DEL PEDIDO
                // ==================================

                const [actualizado] =
                    await conexion.query(
                        `
                        UPDATE pedidos

                        SET
                            estado = 'CANCELADO',
                            observaciones = ?

                        WHERE id_pedido = ?
                        `,
                        [
                            motivo,
                            pedidoId
                        ]
                    );

                if (
                    actualizado.affectedRows !== 1
                ) {
                    throw crearError(
                        409,
                        'No se pudo actualizar el pedido.'
                    );
                }

                await conexion.commit();
                transaccionActiva = false;

                return res.json({
                    ok: true,
                    id: `PED-${pedidoId}`,
                    status: 'Cancelado',
                    statusCode: 'CANCELADO',
                    cancelReason: motivo,
                    message:
                        'Pedido cancelado correctamente.'
                });

            } catch (error) {
                if (conexion && transaccionActiva) {
                    try {
                        await conexion.rollback();
                        transaccionActiva = false;
                    } catch (rollbackError) {
                        console.error(
                            'Error al revertir cancelación:',
                            rollbackError
                        );

                        conexion.destroy();
                        conexion = null;
                    }
                }

                console.error(
                    'Error al cancelar pedido:',
                    error
                );

                next(normalizarError(error));

            } finally {
                await cerrarConexion(
                    conexion,
                    tiempoOriginal
                );
            }
        }
    );

    // ==========================================
    // INTEGRACIÓN DE PAGOS EXTERNOS
    // ==========================================

    api.post('/payments/session', (_req, res) => {
        return res.status(501).json({
            error:
                'La pasarela de pago externa todavía no está integrada.'
        });
    });
}
