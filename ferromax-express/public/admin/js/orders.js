
import { esc, money, call, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   FERROMAX - PEDIDOS DE CLIENTES
========================================== */

const fecha = value => {
    if (!value) return 'Sin fecha';

    const f = new Date(value);

    return Number.isNaN(f.getTime())
        ? 'Sin fecha'
        : f.toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
};

const clienteNombre = p =>
    [
        p.nombre,
        p.apellido_paterno,
        p.apellido_materno
    ].filter(Boolean).join(' ') || 'Cliente no disponible';

const total = value =>
    money(Number(value) || 0);

/* ==========================================
   ESTILOS
========================================== */

function estilos() {

    if (document.querySelector('#fm-orders-history-css')) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'fm-orders-history-css';

    style.textContent = `
        .fm-pedidos {
            max-width: 1480px;
            margin: 0 auto;
        }

        .fm-pedidos [hidden] {
            display: none !important;
        }

        .fm-pedidos h1 {
            margin: 4px 0 8px;
        }

        .fm-pedidos .fm-order-stats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 15px;
            margin: 24px 0;
        }

        .fm-pedidos .fm-order-stat {
            padding: 20px;
            background: #fff;
            border: 1px solid #e9e2e4;
        }

        .fm-pedidos .fm-order-stat span {
            display: block;
            font-size: 12px;
            color: #61585d;
        }

        .fm-pedidos .fm-order-stat strong {
            display: block;
            margin: 9px 0;
            font-size: 29px;
            color: #ba102d;
        }

        .fm-pedidos .fm-order-stat small {
            color: #777;
            font-size: 11px;
        }

        .fm-pedidos .fm-order-panel {
            padding: 23px;
            margin-bottom: 22px;
            background: #fff;
        }

        .fm-pedidos .fm-order-panel-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
        }

        .fm-pedidos .fm-order-panel-head h2 {
            margin: 0 0 6px;
        }

        .fm-pedidos .fm-order-search {
            display: flex;
            gap: 12px;
            margin: 14px 0 20px;
        }

        .fm-pedidos .fm-order-search input,
        .fm-pedidos .fm-order-search select {
            padding: 11px 13px;
            border: 1px solid #dfd6da;
            background: #fff;
            color: #252025;
            min-height: 42px;
        }

        .fm-pedidos .fm-order-search input {
            flex: 1;
            min-width: 0;
        }

        .fm-pedidos .fm-order-name {
            display: block;
            font-weight: 700;
        }

        .fm-pedidos .fm-order-email {
            display: block;
            margin-top: 4px;
            color: #777;
            font-size: 12px;
            overflow-wrap: anywhere;
        }

        .fm-pedidos .fm-order-count {
            display: inline-block;
            color: #ad1029;
            background: #fff0f3;
            font-weight: 700;
            padding: 6px 10px;
        }

        .fm-pedidos .fm-order-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
        }

        .fm-pedidos .fm-order-empty {
            text-align: center;
            padding: 24px !important;
            color: #777;
        }

        .fm-pedidos .fm-order-information {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 15px;
            margin: 18px 0;
        }

        .fm-pedidos .fm-order-information article {
            border: 1px solid #ece5e7;
            padding: 17px;
            background: #fbf9f9;
        }

        .fm-pedidos .fm-order-information p {
            margin: 9px 0;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .fm-pedidos .fm-order-status {
            font-size: 11px;
            font-weight: 700;
            background: #fff2db;
            padding: 6px 10px;
            display: inline-block;
        }

        .fm-pedidos .fm-order-total {
            text-align: right;
            padding: 18px 0;
            color: #b4102b;
            font-size: 17px;
            font-weight: 800;
        }

        @media (max-width: 1150px) {
            .fm-pedidos .fm-order-stats {
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 720px) {
            .fm-pedidos .fm-order-information,
            .fm-pedidos .fm-order-stats {
                grid-template-columns: 1fr;
            }

            .fm-pedidos .fm-order-panel {
                padding: 15px;
            }

            .fm-pedidos .fm-order-search,
            .fm-pedidos .fm-order-panel-head {
                flex-direction: column;
                align-items: stretch;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   PÁGINA PRINCIPAL DE PEDIDOS
========================================== */

export async function orders() {

    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const respuesta = await call('/orders');

    if (!Array.isArray(respuesta)) {
        throw new Error(
            'No se pudo obtener la lista de pedidos.'
        );
    }

    const pedidos = [...respuesta].sort(
        (a, b) =>
            new Date(b.fecha) - new Date(a.fecha) ||
            Number(b.id) - Number(a.id)
    );

    /* ======================================
       AGRUPAR PEDIDOS POR ID DE CLIENTE

       Dos clientes con el mismo nombre
       nunca se mezclarán.
    ====================================== */

    const porCliente = new Map();

    for (const p of pedidos) {

        const clave = p.clienteId != null
            ? `usuario-${p.clienteId}`
            : `sin-usuario-pedido-${p.id}`;

        if (!porCliente.has(clave)) {

            porCliente.set(clave, {
                clave,
                nombre: clienteNombre(p),
                correo: p.correo || '',
                pedidos: []
            });
        }

        porCliente.get(clave).pedidos.push(p);
    }

    const clientes = [...porCliente.values()].sort(
        (a, b) =>
            b.pedidos.length - a.pedidos.length ||
            a.nombre.localeCompare(b.nombre, 'es')
    );

    const conocidos = clientes.filter(
        c => !c.clave.startsWith('sin-usuario-pedido-')
    );

    const clientesRecurrentes = conocidos.filter(
        c => c.pedidos.length > 1
    ).length;

    const pendientes = pedidos.filter(
        p =>
            String(p.estado).toUpperCase() ===
            'PENDIENTE'
    ).length;

    const estados = [
        ...new Set(
            pedidos
                .map(p =>
                    String(p.estado || '').toUpperCase()
                )
                .filter(Boolean)
        )
    ].sort();

    estilos();

    /* ======================================
       CONSTRUIR PÁGINA CON LAYOUT ORIGINAL
    ====================================== */

    layout('Pedidos de clientes', 'orders', `

        <div class="fm-pedidos">

            <h1>Pedidos de clientes</h1>

            <p class="sub">
                Consulta cada cliente y todos los
                pedidos que ha realizado en FerreMax.
            </p>

            <!-- ESTADÍSTICAS -->

            <div class="fm-order-stats">

                <article class="fm-order-stat">
                    <span>Pedidos registrados</span>
                    <strong>${pedidos.length}</strong>
                    <small>Compras totales</small>
                </article>

                <article class="fm-order-stat">
                    <span>Clientes con compras</span>
                    <strong>${conocidos.length}</strong>
                    <small>Clientes identificados</small>
                </article>

                <article class="fm-order-stat">
                    <span>Clientes con varios pedidos</span>
                    <strong>${clientesRecurrentes}</strong>
                    <small>Dos o más compras</small>
                </article>

                <article class="fm-order-stat">
                    <span>Pedidos pendientes</span>
                    <strong>${pendientes}</strong>
                    <small>Por atender</small>
                </article>

            </div>

            <!-- PEDIDOS AGRUPADOS POR CLIENTE -->

            <section class="panel fm-order-panel">

                <div class="fm-order-panel-head">

                    <div>
                        <h2>Pedidos por cliente</h2>

                        <p class="sub">
                            Cada usuario aparece una vez.
                            Abre su historial para consultar
                            todas sus compras.
                        </p>
                    </div>

                    <strong id="fmClientesConteo"></strong>

                </div>

                <div class="fm-order-search">

                    <input
                        id="fmBuscarCliente"
                        type="search"
                        placeholder="Buscar cliente o correo"
                        autocomplete="off"
                    >

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Pedidos</th>
                                <th>Total comprado</th>
                                <th>Última compra</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="fmTablaClientes"></tbody>

                    </table>

                </div>

            </section>

            <!-- HISTORIAL DEL CLIENTE SELECCIONADO -->

            <section
                class="panel fm-order-panel"
                id="fmHistorialCliente"
                hidden
            ></section>

            <!-- TODOS LOS PEDIDOS -->

            <section class="panel fm-order-panel">

                <div class="fm-order-panel-head">

                    <div>
                        <h2>Todos los pedidos</h2>

                        <p class="sub">
                            Listado individual de todas
                            las compras registradas.
                        </p>
                    </div>

                    <strong id="fmPedidosConteo"></strong>

                </div>

                <div class="fm-order-search">

                    <input
                        id="fmBuscarPedido"
                        type="search"
                        placeholder="Buscar folio, nombre o correo"
                        autocomplete="off"
                    >

                    <select id="fmEstadoPedido">

                        <option value="">
                            Todos los estados
                        </option>

                        ${estados.map(e => `
                            <option value="${esc(e)}">
                                ${esc(
                                    e.replaceAll('_', ' ')
                                )}
                            </option>
                        `).join('')}

                    </select>

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="fmTablaPedidos"></tbody>

                    </table>

                </div>

            </section>

            <!-- DETALLE DE UNA COMPRA -->

            <section
                class="panel fm-order-panel"
                id="fmDetallePedido"
                hidden
            ></section>

        </div>

    `);

    const $ = selector =>
        document.querySelector(selector);

    const area = $('.fm-pedidos');

    /* ======================================
       FUNCIONES DE PRESENTACIÓN
    ====================================== */

    const nombreYCorreo = p => `
        <strong class="fm-order-name">
            ${esc(clienteNombre(p))}
        </strong>

        <small class="fm-order-email">
            ${esc(p.correo || 'Sin correo')}
        </small>
    `;

    const estado = p => `
        <span class="fm-order-status">
            ${esc(p.estado || 'Sin estado')}
        </span>
    `;

    /* ======================================
       GENERAR FILAS DE PEDIDOS
    ====================================== */

    function tablaPedidos(lista, conCliente = false) {

        if (!lista.length) {

            return `
                <tr>
                    <td
                        colspan="${conCliente ? 6 : 5}"
                        class="fm-order-empty"
                    >
                        No se encontraron pedidos.
                    </td>
                </tr>
            `;
        }

        return lista.map(p => `

            <tr>

                <td>
                    <strong>#${esc(p.id)}</strong>
                </td>

                <td>
                    ${esc(fecha(p.fecha))}
                </td>

                ${conCliente ? `
                    <td>
                        ${nombreYCorreo(p)}
                    </td>
                ` : ''}

                <td>
                    <strong>
                        ${total(p.total)}
                    </strong>
                </td>

                <td>
                    ${estado(p)}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn light"
                        data-accion="detalle"
                        data-pedido="${esc(p.id)}"
                    >
                        Ver detalle
                    </button>
                </td>

            </tr>

        `).join('');
    }

    /* ======================================
       MOSTRAR CLIENTES AGRUPADOS
    ====================================== */

    function pintarClientes() {

        const termino = $('#fmBuscarCliente')
            .value
            .trim()
            .toLowerCase();

        const lista = clientes.filter(c =>
            `${c.nombre} ${c.correo}`
                .toLowerCase()
                .includes(termino)
        );

        $('#fmClientesConteo').textContent =
            `${lista.length} clientes`;

        $('#fmTablaClientes').innerHTML = lista.length

            ? lista.map(c => `

                <tr>

                    <td>

                        <strong class="fm-order-name">
                            ${esc(c.nombre)}
                        </strong>

                        <small class="fm-order-email">
                            ${esc(c.correo || 'Sin correo')}
                        </small>

                    </td>

                    <td>

                        <span class="fm-order-count">

                            ${c.pedidos.length}

                            ${c.pedidos.length === 1
                                ? 'pedido'
                                : 'pedidos'}

                        </span>

                    </td>

                    <td>

                        <strong>
                            ${total(
                                c.pedidos.reduce(
                                    (n, p) =>
                                        n + Number(p.total || 0),
                                    0
                                )
                            )}
                        </strong>

                    </td>

                    <td>
                        ${esc(
                            fecha(c.pedidos[0]?.fecha)
                        )}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="btn light"
                            data-accion="historial"
                            data-cliente="${esc(c.clave)}"
                        >
                            Ver sus pedidos
                        </button>

                    </td>

                </tr>

            `).join('')

            : `
                <tr>
                    <td
                        colspan="5"
                        class="fm-order-empty"
                    >
                        No se encontraron clientes.
                    </td>
                </tr>
            `;
    }

    /* ======================================
       MOSTRAR TODOS LOS PEDIDOS
    ====================================== */

    function pintarPedidos() {

        const termino = $('#fmBuscarPedido')
            .value
            .trim()
            .toLowerCase();

        const filtro = $('#fmEstadoPedido').value;

        const lista = pedidos.filter(p =>

            `${p.id} ${clienteNombre(p)} ${p.correo || ''}`
                .toLowerCase()
                .includes(termino)

            &&

            (
                !filtro ||
                String(p.estado).toUpperCase() === filtro
            )
        );

        $('#fmPedidosConteo').textContent =
            `${lista.length} de ${pedidos.length} pedidos`;

        $('#fmTablaPedidos').innerHTML =
            tablaPedidos(lista, true);
    }

    /* ======================================
       HISTORIAL COMPLETO DE UN CLIENTE
    ====================================== */

    function mostrarHistorial(clave) {

        const cliente = porCliente.get(clave);

        if (!cliente) return;

        const seccion = $('#fmHistorialCliente');

        seccion.hidden = false;

        seccion.innerHTML = `

            <div class="fm-order-panel-head">

                <div>

                    <h2>
                        Historial de ${esc(cliente.nombre)}
                    </h2>

                    <p class="sub">

                        ${esc(
                            cliente.correo || 'Sin correo'
                        )}

                        · ${cliente.pedidos.length}

                        ${cliente.pedidos.length === 1
                            ? 'pedido'
                            : 'pedidos'}

                    </p>

                </div>

                <button
                    type="button"
                    class="btn light"
                    data-accion="cerrar-historial"
                >
                    Cerrar historial
                </button>

            </div>

            <div class="table-wrap">

                <table>

                    <thead>

                        <tr>
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Detalle</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${tablaPedidos(cliente.pedidos)}

                    </tbody>

                </table>

            </div>

            <p class="fm-order-total">

                Total de sus compras:

                ${total(
                    cliente.pedidos.reduce(
                        (n, p) =>
                            n + Number(p.total || 0),
                        0
                    )
                )}

            </p>

        `;

        seccion.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /* ======================================
       DETALLE INDIVIDUAL DE UN PEDIDO
    ====================================== */

    let consultaActual = 0;

    async function mostrarDetalle(id) {

        const turno = ++consultaActual;

        const seccion = $('#fmDetallePedido');

        seccion.hidden = false;

        seccion.innerHTML = `
            <p>
                Cargando detalle del pedido
                #${esc(id)}...
            </p>
        `;

        seccion.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        try {

            const respuesta = await call(
                `/orders/${encodeURIComponent(id)}`
            );

            if (turno !== consultaActual) return;

            const p = respuesta.pedido;

            const articulos = Array.isArray(
                respuesta.productos
            )
                ? respuesta.productos
                : [];

            if (!p) {
                throw new Error(
                    'El pedido no existe.'
                );
            }

            const direccion = [

                [
                    p.calle,
                    p.numeroExterior,
                    p.numeroInterior
                ].filter(Boolean).join(' '),

                p.colonia,

                p.codigoPostal
                    ? `C.P. ${p.codigoPostal}`
                    : '',

                [
                    p.ciudad,
                    p.entidad
                ].filter(Boolean).join(', ')

            ].filter(Boolean).join(' · ');

            seccion.innerHTML = `

                <div class="fm-order-panel-head">

                    <div>

                        <h2>
                            Detalle del pedido #${esc(p.id)}
                        </h2>

                        <p class="sub">
                            ${esc(fecha(p.fecha))}
                        </p>

                    </div>

                    <button
                        type="button"
                        class="btn light"
                        data-accion="cerrar-detalle"
                    >
                        Cerrar detalle
                    </button>

                </div>

                <div class="fm-order-information">

                    <article>

                        <h3>Cliente</h3>

                        <p>
                            <b>Nombre:</b>
                            ${esc(clienteNombre(p))}
                        </p>

                        <p>
                            <b>Correo:</b>
                            ${esc(p.correo || 'Sin correo')}
                        </p>

                        <p>
                            <b>Pedidos del cliente:</b>
                            ${Number(
                                p.totalPedidosCliente
                            ) || 0}
                        </p>

                    </article>

                    <article>

                        <h3>Compra</h3>

                        <p>
                            <b>Estado:</b>
                            ${esc(
                                p.estado || 'No indicado'
                            )}
                        </p>

                        <p>
                            <b>Método de pago:</b>
                            ${esc(
                                p.metodoPago || 'No indicado'
                            )}
                        </p>

                        <p>
                            <b>Dirección:</b>
                            ${esc(
                                direccion || 'No registrada'
                            )}
                        </p>

                        <p>
                            <b>Observaciones:</b>
                            ${esc(
                                p.observaciones ||
                                'Sin observaciones'
                            )}
                        </p>

                    </article>

                </div>

                <h3>Productos comprados</h3>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>SKU</th>
                                <th>Cantidad</th>
                                <th>Precio unitario</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${articulos.length

                                ? articulos.map(a => `

                                    <tr>

                                        <td>
                                            ${esc(
                                                a.nombre ||
                                                'Producto no disponible'
                                            )}
                                        </td>

                                        <td>
                                            ${esc(a.sku || '—')}
                                        </td>

                                        <td>
                                            ${Number(
                                                a.cantidad
                                            ) || 0}
                                        </td>

                                        <td>
                                            ${total(
                                                a.precioUnitario
                                            )}
                                        </td>

                                        <td>
                                            ${total(
                                                a.subtotal
                                            )}
                                        </td>

                                    </tr>

                                `).join('')

                                : `
                                    <tr>
                                        <td colspan="5">
                                            Sin artículos registrados.
                                        </td>
                                    </tr>
                                `
                            }

                        </tbody>

                    </table>

                </div>

                <div class="fm-order-total">

                    Subtotal:
                    ${total(p.subtotal)}

                    · Envío:
                    ${total(p.costoEnvio)}

                    <p>
                        Total del pedido:
                        ${total(p.total)}
                    </p>

                </div>

            `;

        } catch (error) {

            if (turno !== consultaActual) return;

            seccion.innerHTML = `

                <p style="color:#af102b">
                    ${esc(error.message)}
                </p>

                <button
                    type="button"
                    class="btn light"
                    data-accion="cerrar-detalle"
                >
                    Cerrar
                </button>
            `;
        }
    }

    /* ======================================
       EVENTOS
    ====================================== */

    $('#fmBuscarCliente').addEventListener(
        'input',
        pintarClientes
    );

    $('#fmBuscarPedido').addEventListener(
        'input',
        pintarPedidos
    );

    $('#fmEstadoPedido').addEventListener(
        'change',
        pintarPedidos
    );

    area.addEventListener('click', event => {

        const boton = event.target.closest(
            'button[data-accion]'
        );

        if (!boton || !area.contains(boton)) {
            return;
        }

        switch (boton.dataset.accion) {

            case 'historial':

                mostrarHistorial(
                    boton.dataset.cliente
                );

                break;

            case 'detalle':

                mostrarDetalle(
                    boton.dataset.pedido
                );

                break;

            case 'cerrar-historial':

                $('#fmHistorialCliente').hidden = true;

                break;

            case 'cerrar-detalle':

                consultaActual++;

                $('#fmDetallePedido').hidden = true;

                break;
        }
    });

    /* ======================================
       CARGA INICIAL
    ====================================== */

    pintarClientes();

    pintarPedidos();
}
