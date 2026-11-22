
import {
    api,
    user,
    favorites,
    cart,
    esc,
    mxn
} from './core.js';

import { card } from './productos.js';

/* ==========================================
   FERROMAX - PANEL DE CLIENTE
========================================== */

const opciones = [
    ['perfil', 'Mi perfil'],
    ['favoritos', 'Mis favoritos'],
    ['pedidos', 'Mis pedidos']
];

/* ==========================================
   ESTILOS DEL PERFIL Y CANCELACIONES
========================================== */

function instalarEstilosPerfil() {

    if (
        document.getElementById(
            'fm-perfil-cliente-estilos'
        )
    ) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'fm-perfil-cliente-estilos';

    style.textContent = `

        /* BARRA LATERAL FIJA */

        @media (min-width: 900px) {

            #app .fm-cuenta {
                overflow: visible !important;
            }

            #app .fm-cuenta-layout {
                display: grid;
                grid-template-columns:
                    minmax(240px, 290px)
                    minmax(0, 1fr);
                align-items: start !important;
                overflow: visible !important;
            }

            #app .fm-cuenta-sidebar {
                position: sticky !important;
                top: 20px !important;
                align-self: start !important;

                height: max-content;

                max-height: calc(100dvh - 40px);

                overflow-y: auto;
                overflow-x: hidden;

                overscroll-behavior: contain;

                z-index: 10;
            }

            #app .fm-cuenta-main {
                min-width: 0;
                overflow: visible;
            }
        }

        @media (max-width: 899px) {

            #app .fm-cuenta-sidebar {
                position: static !important;
                max-height: none;
                overflow: visible;
            }
        }

        /* CANCELACIONES */

        .fm-pedido-cancelacion {
            margin-top: 20px;
            padding: 20px;
            border: 1px solid #e8dce0;
            background: #fffafa;
        }

        .fm-pedido-cancelacion p {
            margin: 0 0 12px;
            color: #514a4d;
            font-size: 13px;
            line-height: 1.7;
        }

        .fm-pedido-cancelacion strong {
            display: block;
            color: #b70f2b;
            margin-top: 5px;
        }

        .fm-cancelar-btn {
            background: #c8102e;
            color: #fff;
            padding: 11px 17px;
            border: 1px solid #c8102e;
            cursor: pointer;
            font-weight: 700;
        }

        .fm-cancelar-btn:hover {
            background: #a90d26;
        }

        .fm-cancelacion-form {
            margin-top: 17px;
            padding-top: 17px;
            border-top: 1px solid #e6dadd;
        }

        .fm-cancelacion-form[hidden] {
            display: none !important;
        }

        .fm-cancelacion-form label {
            display: block;
            margin-bottom: 9px;
            font-size: 13px;
            font-weight: 700;
        }

        .fm-cancelacion-form textarea {
            display: block;
            width: 100%;
            min-height: 120px;
            padding: 13px;

            border: 1px solid #ded5d8;
            background: #fff;
            color: #222;

            font: inherit;
            resize: vertical;
        }

        .fm-cancelacion-form textarea:focus {
            outline: 2px solid #c8102e;
            outline-offset: 2px;
        }

        .fm-cancel-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }

        .fm-cancel-actions button {
            padding: 11px 16px;
        }

        .fm-cancel-error {
            color: #b30e2a !important;
            font-size: 12px;
            margin: 10px 0 !important;
        }

        .fm-cancel-reason {
            margin-top: 18px;
            padding: 15px;
            border-left: 3px solid #c8102e;
            background: #fff2f4;
            line-height: 1.7;
            overflow-wrap: anywhere;
        }

        .fm-cancel-reason strong {
            display: block;
            margin-bottom: 5px;
        }

        .fm-cuenta-order-status.cancelado {
            background: #fbe8ec;
            color: #b0102b;
        }

        .fm-cuenta-order-status.entregado {
            background: #e9f5ec;
            color: #267344;
        }

        .fm-cuenta-order-status.pendiente {
            background: #fff3de;
            color: #95610b;
        }

        .fm-cuenta-order-status.confirmado {
            background: #eaf0ff;
            color: #294d96;
        }

        @media (max-width: 600px) {

            .fm-cancel-actions {
                flex-direction: column;
            }

            .fm-cancel-actions button {
                width: 100%;
            }

            .fm-pedido-cancelacion {
                padding: 14px;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   INFORMACIÓN PERSONAL
========================================== */

function seccionPerfil() {

    const nombre = String(
        user?.name ||
        user?.nombre ||
        'Cliente'
    );

    const correo = String(
        user?.email ||
        ''
    );

    const cantidadCarrito = cart.reduce(
        (total, producto) =>
            total + Number(
                producto.quantity || 0
            ),
        0
    );

    return `

        <div class="fm-cuenta-section-head">

            <span>INFORMACIÓN PERSONAL</span>

            <h2>Mi perfil</h2>

            <p>
                Consulta tus datos y accede a tus
                compras y productos favoritos.
            </p>

        </div>

        <div class="fm-cuenta-data">

            <div class="fm-cuenta-data-item">

                <span>Nombre completo</span>

                <strong>
                    ${esc(nombre)}
                </strong>

            </div>

            <div class="fm-cuenta-data-item">

                <span>Correo electrónico</span>

                <strong>
                    ${esc(correo)}
                </strong>

            </div>

            <div class="fm-cuenta-data-item">

                <span>Tipo de cuenta</span>

                <strong>
                    Cliente FerreMax
                </strong>

            </div>

        </div>

        <h3 class="fm-cuenta-subtitle">
            Accesos rápidos
        </h3>

        <div class="fm-cuenta-shortcuts">

            <a
                href="#/cuenta?tab=favoritos"
                class="fm-cuenta-shortcut"
            >

                <span class="fm-cuenta-shortcut-number">
                    ${favorites.size}
                </span>

                <strong>Mis favoritos</strong>

                <small>
                    Productos que guardaste
                </small>

                <span class="fm-cuenta-shortcut-arrow">
                    Ver favoritos →
                </span>

            </a>

            <a
                href="#/cuenta?tab=pedidos"
                class="fm-cuenta-shortcut"
            >

                <span class="fm-cuenta-shortcut-symbol">
                    ▤
                </span>

                <strong>Mis pedidos</strong>

                <small>
                    Consulta tu historial de compras
                </small>

                <span class="fm-cuenta-shortcut-arrow">
                    Ver pedidos →
                </span>

            </a>

            <a
                href="#/carrito"
                class="fm-cuenta-shortcut"
            >

                <span class="fm-cuenta-shortcut-number">
                    ${cantidadCarrito}
                </span>

                <strong>Mi carrito</strong>

                <small>
                    Productos de tu carrito
                </small>

                <span class="fm-cuenta-shortcut-arrow">
                    Ver carrito →
                </span>

            </a>

        </div>
    `;
}

/* ==========================================
   PRODUCTOS FAVORITOS
========================================== */

async function seccionFavoritos() {

    let productos;

    try {

        const respuesta = await api('/products');

        productos = Array.isArray(respuesta)
            ? respuesta
            : Array.isArray(respuesta?.products)
                ? respuesta.products
                : [];

    } catch (error) {

        return `

            <div class="fm-cuenta-section-head">
                <h2>Mis favoritos</h2>
            </div>

            <div
                class="fm-cuenta-empty"
                role="alert"
            >
                No se pudieron cargar los productos.
                ${esc(error.message)}
            </div>
        `;
    }

    const guardados = productos.filter(
        producto =>
            favorites.has(
                String(producto.id)
            )
    );

    return `

        <div class="fm-cuenta-section-head">

            <span>PRODUCTOS GUARDADOS</span>

            <h2>Mis favoritos</h2>

            <p>
                Aquí encontrarás los productos que
                marcaste con el corazón en el catálogo.
            </p>

        </div>

        <div class="fm-cuenta-favoritos-resumen">

            <strong class="fm-cuenta-favoritos-count">
                ${guardados.length}
            </strong>

            productos favoritos

        </div>

        ${guardados.length ? `

            <div class="fm-cuenta-products">

                ${guardados.map(
                    producto => card(producto)
                ).join('')}

            </div>

        ` : `

            <div class="fm-cuenta-empty">

                <h3>
                    Todavía no tienes productos favoritos
                </h3>

                <p>
                    Explora nuestra tienda y presiona
                    el corazón de los productos que te gusten.
                </p>

                <a
                    href="#/catalogo"
                    class="btn"
                >
                    Explorar productos
                </a>

            </div>

        `}
    `;
}

/* ==========================================
   FORMATEAR FECHAS Y TIEMPOS
========================================== */

function formatearFecha(valor) {

    if (!valor) {
        return 'Fecha no disponible';
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return 'Fecha no disponible';
    }

    return fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatearTiempo(segundos) {

    const tiempo = Math.max(
        0,
        Number(segundos) || 0
    );

    const horas = Math.floor(
        tiempo / 3600
    );

    const minutos = Math.floor(
        (tiempo % 3600) / 60
    );

    return `${horas} h ${minutos} min`;
}

/* ==========================================
   HISTORIAL DE PEDIDOS
========================================== */

async function seccionPedidos() {

    let pedidos;

    try {

        const respuesta = await api('/orders');

        pedidos = Array.isArray(respuesta)
            ? respuesta
            : Array.isArray(respuesta?.orders)
                ? respuesta.orders
                : [];

    } catch (error) {

        return `

            <div class="fm-cuenta-section-head">

                <h2>Mis pedidos</h2>

            </div>

            <div
                class="fm-cuenta-empty"
                role="alert"
            >

                No se pudo consultar tu historial.

                ${esc(error.message)}

            </div>
        `;
    }

    return `

        <div class="fm-cuenta-section-head">

            <span>HISTORIAL DE COMPRAS</span>

            <h2>Mis pedidos</h2>

            <p>
                Consulta tus pedidos y su estado.
                Puedes cancelarlos dentro de las primeras
                12 horas si todavía no se han enviado.
            </p>

        </div>

        ${pedidos.length ? `

            <div class="fm-cuenta-orders">

                ${pedidos.map(pedido => {

                    const codigo = String(
                        pedido.statusCode || ''
                    ).toUpperCase();

                    const numero = String(
                        pedido.id || ''
                    ).match(/(\d+)$/)?.[1] || '';

                    const puedeCancelar =
                        pedido.canCancel === true &&
                        numero !== '';

                    const cancelado =
                        codigo === 'CANCELADO';

                    const claseEstado =
                        codigo === 'CANCELADO'
                            ? 'cancelado'
                            : codigo === 'ENTREGADO'
                                ? 'entregado'
                                : codigo === 'PENDIENTE'
                                    ? 'pendiente'
                                    : codigo === 'CONFIRMADO'
                                        ? 'confirmado'
                                        : '';

                    return `

                        <article class="fm-cuenta-order">

                            <div class="fm-cuenta-order-header">

                                <div>

                                    <small>
                                        NÚMERO DE PEDIDO
                                    </small>

                                    <h3>
                                        #${esc(pedido.id)}
                                    </h3>

                                    <span>
                                        ${esc(
                                            formatearFecha(
                                                pedido.createdAt
                                            )
                                        )}
                                    </span>

                                </div>

                                <span
                                    class="fm-cuenta-order-status ${claseEstado}"
                                >

                                    ${esc(
                                        pedido.status ||
                                        'Registrado'
                                    )}

                                </span>

                            </div>

                            <div class="fm-cuenta-order-items">

                                ${(pedido.items || []).map(
                                    producto => `

                                        <div class="fm-cuenta-order-item">

                                            <span>

                                                ${Number(
                                                    producto.quantity
                                                ) || 0}

                                                ×

                                                ${esc(
                                                    producto.name
                                                )}

                                            </span>

                                            <strong>
                                                ${mxn(
                                                    producto.subtotal
                                                )}
                                            </strong>

                                        </div>

                                    `
                                ).join('')}

                            </div>

                            <div class="fm-cuenta-order-footer">
                                <div>
                                    <span>Total del pedido</span>
                                    <strong>${mxn(pedido.total)}</strong>
                                </div>

                                ${pedido.paymentLabel ? `
                                    <div>
                                        <span>Estado del pago</span>
                                        <strong>${esc(pedido.paymentLabel)}</strong>

                                        ${pedido.paymentStatus === 'stripe_pendiente' && numero ? `
                                            <a href="#/pago/${numero}">Ver pago</a>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>

                            ${puedeCancelar ? `

                                <div
                                    class="fm-pedido-cancelacion"
                                    data-cancel-deadline="${
                                        Date.now() +
                                        Number(
                                            pedido.secondsToCancel || 0
                                        ) * 1000
                                    }"
                                >

                                    <p>

                                        Puedes cancelar este pedido
                                        durante las primeras 12 horas.

                                        <strong>
                                            Tiempo restante:
                                            <span
                                                data-tiempo-restante
                                            >
                                                ${formatearTiempo(
                                                    pedido.secondsToCancel
                                                )}
                                            </span>
                                        </strong>

                                    </p>

                                    <button
                                        type="button"
                                        class="fm-cancelar-btn"
                                        data-accion-pedido="abrir"
                                    >
                                        Cancelar pedido
                                    </button>

                                    <div
                                        class="fm-cancelacion-form"
                                        data-formulario-cancelacion
                                        hidden
                                    >

                                        <label
                                            for="motivo-${numero}"
                                        >
                                            ¿Por qué deseas cancelar
                                            este pedido?
                                        </label>

                                        <textarea
                                            id="motivo-${numero}"
                                            minlength="10"
                                            maxlength="200"
                                            placeholder="Escribe el motivo de cancelación (obligatorio)."
                                        ></textarea>

                                        <p
                                            class="fm-cancel-error"
                                            role="alert"
                                        ></p>

                                        <div class="fm-cancel-actions">

                                            <button
                                                type="button"
                                                class="btn"
                                                data-accion-pedido="confirmar"
                                                data-id-pedido="${numero}"
                                            >
                                                Confirmar cancelación
                                            </button>

                                            <button
                                                type="button"
                                                class="btn light"
                                                data-accion-pedido="cerrar"
                                            >
                                                Volver
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            ` : ''}

                            ${cancelado ? `

                                <div class="fm-cancel-reason">

                                    <strong>
                                        Pedido cancelado
                                    </strong>

                                    ${pedido.cancelReason
                                        ? `
                                            Motivo:
                                            ${esc(
                                                pedido.cancelReason
                                            )}
                                        `
                                        : `
                                            Este pedido fue cancelado.
                                        `
                                    }

                                </div>

                            ` : ''}

                        </article>

                    `;

                }).join('')}

            </div>

        ` : `

            <div class="fm-cuenta-empty">

                <h3>
                    Aún no tienes pedidos registrados
                </h3>

                <p>
                    Cuando realices una compra,
                    podrás consultar aquí su información,
                    productos, estado y total.
                </p>

                <a
                    href="#/catalogo"
                    class="btn"
                >
                    Ir a la tienda
                </a>

            </div>

        `}
    `;
}

/* ==========================================
   PANEL PRINCIPAL DEL CLIENTE
========================================== */

export async function vistaPanelCliente(
    pestaña = 'perfil'
) {

    instalarEstilosPerfil();

    const actual = opciones.some(
        ([clave]) => clave === pestaña
    )
        ? pestaña
        : 'perfil';

    const nombre = String(
        user?.name ||
        user?.nombre ||
        'Cliente'
    );

    const correo = String(
        user?.email || ''
    );

    const inicial = nombre
        .charAt(0)
        .toUpperCase();

    let contenido = '';

    if (actual === 'perfil') {

        contenido = seccionPerfil();
    }

    if (actual === 'favoritos') {

        contenido = await seccionFavoritos();
    }

    if (actual === 'pedidos') {

        contenido = await seccionPedidos();
    }

    return `

        <section class="fm-cuenta">

            <div class="fm-cuenta-heading">

                <span>
                    FERROMAX · ÁREA DE CLIENTES
                </span>

                <h1>Mi cuenta</h1>

                <p>
                    Administra tu información,
                    productos favoritos y pedidos.
                </p>

            </div>

            <div class="fm-cuenta-layout">

                <!-- BARRA LATERAL -->

                <aside class="fm-cuenta-sidebar">

                    <div class="fm-cuenta-user">

                        <div class="fm-cuenta-avatar">
                            ${esc(inicial)}
                        </div>

                        <div class="fm-cuenta-user-data">

                            <strong>
                                ${esc(nombre)}
                            </strong>

                            <span>
                                ${esc(correo)}
                            </span>

                        </div>

                    </div>

                    <nav
                        class="fm-cuenta-nav"
                        aria-label="Opciones de mi cuenta"
                    >

                        ${opciones.map(
                            ([clave, texto]) => `

                                <a
                                    href="#/cuenta?tab=${clave}"

                                    class="${
                                        clave === actual
                                            ? 'active'
                                            : ''
                                    }"

                                    ${
                                        clave === actual
                                            ? 'aria-current="page"'
                                            : ''
                                    }
                                >

                                    <span>
                                        ${texto}
                                    </span>

                                    <span aria-hidden="true">
                                        →
                                    </span>

                                </a>

                            `
                        ).join('')}

                        <a href="#/carrito">

                            <span>Mi carrito</span>

                            <span aria-hidden="true">
                                →
                            </span>

                        </a>

                        <a href="#/catalogo">

                            <span>
                                Seguir comprando
                            </span>

                            <span aria-hidden="true">
                                →
                            </span>

                        </a>

                    </nav>

                    <button
                        type="button"
                        class="fm-cuenta-logout"
                        data-logout
                    >
                        Cerrar sesión
                    </button>

                </aside>

                <!-- CONTENIDO DEL CLIENTE -->

                <div class="fm-cuenta-main">

                    ${contenido}

                </div>

            </div>

        </section>
    `;
}

/* ==========================================
   ACTUALIZAR TIEMPO DE CANCELACIÓN

   El servidor sigue siendo quien decide
   si el plazo de 12 horas ha terminado.
========================================== */

function actualizarTiemposCancelacion() {

    document.querySelectorAll(
        '.fm-pedido-cancelacion[data-cancel-deadline]'
    ).forEach(contenedor => {

        const limite = Number(
            contenedor.dataset.cancelDeadline
        );

        const segundos = Math.max(
            0,
            Math.floor(
                (limite - Date.now()) / 1000
            )
        );

        const elemento = contenedor.querySelector(
            '[data-tiempo-restante]'
        );

        if (elemento) {

            elemento.textContent =
                formatearTiempo(segundos);
        }

        if (segundos <= 0) {

            contenedor.remove();
        }
    });
}

setInterval(
    actualizarTiemposCancelacion,
    30000
);

/* ==========================================
   ABRIR Y CONFIRMAR CANCELACIONES
========================================== */

document.addEventListener(
    'click',
    async event => {

        const boton = event.target.closest?.(
            'button[data-accion-pedido]'
        );

        if (!boton) return;

        const tarjeta = boton.closest(
            '.fm-cuenta-order'
        );

        if (!tarjeta) return;

        event.preventDefault();

        const formulario = tarjeta.querySelector(
            '[data-formulario-cancelacion]'
        );

        if (!formulario) return;

        const accion =
            boton.dataset.accionPedido;

        /* ABRIR FORMULARIO */

        if (accion === 'abrir') {

            formulario.hidden = false;

            formulario.querySelector(
                'textarea'
            )?.focus();

            return;
        }

        /* CERRAR FORMULARIO */

        if (accion === 'cerrar') {

            formulario.hidden = true;

            return;
        }

        if (accion !== 'confirmar') {
            return;
        }

        /* VALIDAR MOTIVO */

        const textarea =
            formulario.querySelector('textarea');

        const motivo =
            textarea?.value.trim() || '';

        const mensaje =
            formulario.querySelector(
                '.fm-cancel-error'
            );

        if (
            motivo.length < 10 ||
            motivo.length > 200
        ) {

            mensaje.textContent =
                'Explica el motivo de cancelación ' +
                '(entre 10 y 200 caracteres).';

            textarea?.focus();

            return;
        }

        /* CONFIRMAR DECISIÓN */

        const confirmar = window.confirm(
            '¿Confirmas que deseas cancelar ' +
            'este pedido? Esta acción no se ' +
            'puede deshacer.'
        );

        if (!confirmar) {
            return;
        }

        boton.disabled = true;

        mensaje.textContent =
            'Procesando cancelación…';

        try {

            const id = Number(
                boton.dataset.idPedido
            );

            const resultado = await api(
                `/orders/${id}/cancel`,
                {
                    method: 'POST',

                    body: {
                        motivo
                    }
                }
            );

            if (!resultado?.ok) {
                throw new Error(
                    'No se pudo confirmar la cancelación.'
                );
            }

            /* RECARGAR PEDIDOS */

            const { render } = await import(
                './navegacion.js'
            );

            await render();

        } catch (error) {

            mensaje.textContent =
                error.message;

            boton.disabled = false;
        }
    }
);

/* ==========================================
   ACTUALIZAR FAVORITOS AL QUITAR EL CORAZÓN
========================================== */

document.addEventListener(
    'click',
    event => {

        const boton = event.target.closest?.(
            '.fm-cuenta-products [data-favorite]'
        );

        if (!boton) return;

        const id = String(
            boton.dataset.favorite
        );

        queueMicrotask(() => {

            if (favorites.has(id)) {
                return;
            }

            const tarjeta = boton.closest(
                '.fm-card'
            );

            tarjeta?.remove();

            const contenedor =
                document.querySelector(
                    '.fm-cuenta-products'
                );

            const contador =
                document.querySelector(
                    '.fm-cuenta-favoritos-count'
                );

            if (contador && contenedor) {

                contador.textContent = String(
                    contenedor.querySelectorAll(
                        '.fm-card'
                    ).length
                );
            }

            if (
                contenedor &&
                !contenedor.querySelector(
                    '.fm-card'
                )
            ) {

                contenedor.outerHTML = `

                    <div class="fm-cuenta-empty">

                        <h3>
                            Ya no tienes favoritos
                        </h3>

                        <p>
                            Puedes agregar más productos
                            desde el catálogo.
                        </p>

                        <a
                            href="#/catalogo"
                            class="btn"
                        >
                            Ver productos
                        </a>

                    </div>
                `;
            }
        });
    }
);
