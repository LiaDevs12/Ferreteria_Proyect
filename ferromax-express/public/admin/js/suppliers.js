
import { esc, call, me } from './core.js';

import { guard } from './auth.js';

import { layout } from './layout.js';

const $ = selector => document.querySelector(selector);

/* ==========================================
   FERROMAX
   IMÁGENES DE PRODUCTOS
========================================== */

function imagenProducto(producto) {

    const url = String(
        producto.imagen || ''
    ).trim();

    const segura =
        /^(https?:\/\/|\/(?!\/))/i.test(url);

    return `
        <div class="fm-prov-imagen">

            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
            >
                <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                />

                <circle
                    cx="8"
                    cy="8"
                    r="2"
                />

                <path
                    d="m3 17 5-5 4 4 3-3 6 6"
                />
            </svg>

            ${segura ? `

                <img
                    src="${esc(url)}"
                    alt="${esc(producto.nombre)}"
                    loading="lazy"
                    onerror="this.remove()"
                >

            ` : ''}

        </div>
    `;
}

/* ==========================================
   GOOGLE MAPS
========================================== */

function direccionParaMapa(direccion) {

    const texto = String(
        direccion || ''
    ).trim();

    if (!texto) return '';

    return /m[eé]xico/i.test(texto)
        ? texto
        : `${texto}, México`;
}

function mapaEmbed(direccion) {

    return (
        'https://maps.google.com/maps?q=' +
        encodeURIComponent(
            direccionParaMapa(direccion)
        ) +
        '&z=16&output=embed'
    );
}

function mapaExterno(direccion) {

    return (
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(
            direccionParaMapa(direccion)
        )
    );
}

/* ==========================================
   ESTILOS
========================================== */

function estilosProveedores() {

    if ($('#fm-suppliers-style')) return;

    const style = document.createElement('style');

    style.id = 'fm-suppliers-style';

    style.textContent = `

        .fm-proveedores {
            max-width: 1450px;
            margin: 0 auto;
        }

        .fm-prov-cabecera {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 22px;
        }

        .fm-prov-cabecera h1 {
            margin: 7px 0;
        }

        .fm-prov-etiqueta {
            color: #bf1231;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.2px;
        }

        .fm-prov-resumen {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 15px;
            margin: 23px 0;
        }

        .fm-prov-cifra {
            background: #fff;
            border: 1px solid #e8e0e0;
            padding: 23px;
        }

        .fm-prov-cifra span,
        .fm-prov-cifra small {
            display: block;
            color: #676167;
            font-size: 12px;
        }

        .fm-prov-cifra strong {
            display: block;
            color: #bb102e;
            font-size: 32px;
            margin: 8px 0;
        }

        .fm-prov-panel {
            padding: 24px;
            margin-bottom: 20px;
        }

        .fm-prov-busqueda {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 17px;
        }

        .fm-prov-busqueda input {
            padding: 11px 13px;
            border: 1px solid #ddd;
            width: min(420px, 100%);
            background: #fff;
        }

        .fm-prov-acciones {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
        }

        .fm-prov-acciones button {
            font-size: 12px;
        }

        .fm-prov-pildora {
            display: inline-block;
            padding: 6px 10px;
            color: #ae102b;
            background: #fff0f2;
            font-weight: 700;
            font-size: 12px;
        }

        .fm-prov-pildora.inactivo {
            color: #555;
            background: #eee;
        }

        .fm-prov-formulario {
            padding: 25px;
            margin: 0 0 22px;
        }

        .fm-prov-formulario h2 {
            margin-bottom: 18px;
        }

        .fm-prov-grid {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 15px;
        }

        .fm-prov-campo {
            display: flex;
            flex-direction: column;
            gap: 7px;
            color: #484048;
            font-weight: 650;
            font-size: 13px;
        }

        .fm-prov-campo input,
        .fm-prov-campo textarea {
            width: 100%;
            padding: 11px 12px;
            border: 1px solid #ddd;
            background: #fff;
            color: #222;
            font: inherit;
            font-weight: 400;
        }

        .fm-prov-campo textarea {
            resize: vertical;
            min-height: 85px;
        }

        .fm-prov-ancho {
            grid-column: 1 / -1;
        }

        .fm-prov-formulario [hidden],
        .fm-proveedores [hidden] {
            display: none !important;
        }

        .fm-prov-productos {
            max-height: 330px;
            overflow: auto;
            border: 1px solid #e5dcdc;
            background: #fff;
            padding: 6px;
        }

        .fm-prov-producto-opcion {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 9px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            font-size: 13px;
        }

        .fm-prov-producto-opcion:last-child {
            border: 0;
        }

        .fm-prov-producto-opcion input {
            width: auto;
            flex: none;
            accent-color: #c8102e;
        }

        .fm-prov-producto-opcion small {
            color: #777;
            display: block;
            margin-top: 4px;
            font-size: 11px;
        }

        /* FOTOGRAFÍAS */

        .fm-prov-imagen {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: none;
            width: 66px;
            height: 66px;
            background: #f5f3f3;
            border: 1px solid #e3dcdc;
            overflow: hidden;
            color: #a59a9f;
        }

        .fm-prov-imagen svg {
            width: 25px;
            height: 25px;
        }

        .fm-prov-imagen img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #fff;
        }

        .fm-prov-aviso {
            color: #766f74;
            font-size: 12px;
            line-height: 1.6;
            margin: 8px 0;
        }

        .fm-prov-botones {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }

        /* DETALLE DEL PROVEEDOR */

        .fm-prov-detalle {
            padding: 24px;
            margin: 20px 0;
        }

        .fm-prov-detalle-cabecera {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
        }

        .fm-prov-detalle-info {
            color: #51494e;
            line-height: 1.8;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .fm-prov-detalle-info p {
            margin: 5px 0;
        }

        /* PRODUCTOS RELACIONADOS */

        .fm-prov-tarjetas {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 17px;
        }

        .fm-prov-tarjeta {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 14px;
            background: #fff;
            border: 1px solid #e6dfe1;
            min-width: 0;
        }

        .fm-prov-tarjeta .fm-prov-imagen {
            width: 100px;
            height: 100px;
        }

        .fm-prov-tarjeta strong {
            display: block;
            font-size: 13px;
            margin-bottom: 6px;
        }

        .fm-prov-tarjeta small {
            display: block;
            color: #777;
            margin-top: 5px;
            font-size: 12px;
            overflow-wrap: anywhere;
        }

        /* MAPA */

        .fm-prov-mapa {
            border: 1px solid #e4dada;
            background: #fafafa;
            padding: 14px;
            margin: 10px 0 0;
        }

        .fm-prov-mapa h3 {
            font-size: 14px;
            margin: 0 0 8px;
        }

        .fm-prov-mapa iframe {
            display: block;
            width: 100%;
            height: 290px;
            border: 0;
            background: #eee;
            margin: 12px 0 8px;
        }

        .fm-prov-mapa a {
            color: #af112e;
            font-size: 12px;
            font-weight: 700;
            text-decoration: underline;
        }

        .fm-prov-mapa-estado {
            color: #666;
            font-size: 12px;
            margin: 6px 0;
        }

        .fm-prov-vacio {
            text-align: center;
            padding: 25px;
            color: #777;
        }

        @media (max-width: 1050px) {

            .fm-prov-tarjetas {
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 780px) {

            .fm-prov-resumen {
                grid-template-columns: 1fr 1fr;
            }

            .fm-prov-grid {
                grid-template-columns: 1fr;
            }

            .fm-prov-ancho {
                grid-column: auto;
            }
        }

        @media (max-width: 620px) {

            .fm-prov-cabecera,
            .fm-prov-busqueda,
            .fm-prov-detalle-cabecera {
                flex-direction: column;
                align-items: stretch;
            }

            .fm-prov-resumen,
            .fm-prov-tarjetas {
                grid-template-columns: 1fr;
            }

            .fm-prov-tarjeta .fm-prov-imagen {
                width: 80px;
                height: 80px;
            }

            .fm-prov-panel,
            .fm-prov-formulario,
            .fm-prov-detalle {
                padding: 15px;
            }
        }
    `;

    document.head.append(style);
}

/* ==========================================
   PÁGINA PRINCIPAL
========================================== */

export async function suppliers() {

    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const [iniciales, catalogo] =
        await Promise.all([
            call('/suppliers'),
            call('/suppliers/products')
        ]);

    if (
        !Array.isArray(iniciales) ||
        !Array.isArray(catalogo)
    ) {
        throw new Error(
            'La API no devolvió los proveedores o los productos.'
        );
    }

    let proveedores = iniciales;

    let editando = null;

    let temporizadorMapa = null;

    estilosProveedores();

    /* ======================================
       INTERFAZ ORIGINAL DE FERROMAX
    ====================================== */

    layout('Proveedores', 'suppliers', `

        <div class="fm-proveedores">

            <div class="fm-prov-cabecera">

                <div>

                    <span class="fm-prov-etiqueta">
                        ABASTECIMIENTO
                    </span>

                    <h1>Proveedores</h1>

                    <p class="sub">
                        Administra proveedores, direcciones
                        y los productos que suministran.
                    </p>

                </div>

                <button
                    type="button"
                    class="btn"
                    id="provNuevo"
                >
                    Agregar proveedor
                </button>

            </div>

            <div
                class="fm-prov-resumen"
                id="provResumen"
            ></div>

            <section
                class="panel fm-prov-formulario"
                id="provFormPanel"
                hidden
            >

                <h2 id="provFormTitulo">
                    Nuevo proveedor
                </h2>

                <form id="provForm">

                    <div class="fm-prov-grid">

                        <label class="fm-prov-campo">

                            Nombre comercial *

                            <input
                                id="provNombre"
                                maxlength="150"
                                required
                                placeholder="Nombre de la empresa"
                            >

                        </label>

                        <label class="fm-prov-campo">

                            Persona de contacto

                            <input
                                id="provContacto"
                                maxlength="150"
                                placeholder="Representante o encargado"
                            >

                        </label>

                        <label class="fm-prov-campo">

                            Teléfono

                            <input
                                id="provTelefono"
                                maxlength="20"
                                placeholder="Número de contacto"
                            >

                        </label>

                        <label class="fm-prov-campo">

                            Correo electrónico

                            <input
                                id="provCorreo"
                                type="email"
                                maxlength="150"
                                placeholder="correo@proveedor.com"
                            >

                        </label>

                        <label class="fm-prov-campo fm-prov-ancho">

                            Dirección del proveedor

                            <input
                                id="provDireccion"
                                maxlength="255"
                                autocomplete="street-address"
                                placeholder="Calle y número, colonia, ciudad, estado, código postal"
                            >

                        </label>

                        <!-- MAPA AUTOMÁTICO -->

                        <div class="fm-prov-ancho fm-prov-mapa">

                            <h3>Ubicación en el mapa</h3>

                            <p class="fm-prov-aviso">
                                Al terminar de escribir la dirección,
                                el mapa se actualiza automáticamente.
                                Verifica que Google Maps haya encontrado
                                el domicilio correcto.
                            </p>

                            <p
                                id="provMapaEstado"
                                class="fm-prov-mapa-estado"
                                aria-live="polite"
                            >
                                Escribe una dirección completa
                                para localizarla.
                            </p>

                            <iframe
                                id="provMapaIframe"
                                title="Mapa de ubicación del proveedor"
                                referrerpolicy="no-referrer-when-downgrade"
                                loading="lazy"
                                hidden
                            ></iframe>

                            <a
                                id="provAbrirMapa"
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                hidden
                            >
                                Abrir ubicación en Google Maps
                            </a>

                        </div>

                        <label class="fm-prov-campo fm-prov-ancho">

                            Notas

                            <textarea
                                id="provNotas"
                                maxlength="4000"
                                placeholder="Horarios de entrega, condiciones o comentarios"
                            ></textarea>

                        </label>

                        <!-- PRODUCTOS CON FOTOGRAFÍAS -->

                        <div class="fm-prov-ancho">

                            <h3>Productos que suministra *</h3>

                            <p class="fm-prov-aviso">
                                Marca uno o varios productos.
                                Cada producto puede tener
                                más de un proveedor.
                            </p>

                            <input
                                id="provBuscarProducto"
                                type="search"
                                placeholder="Buscar nombre, SKU o marca"
                                style="
                                    display:block;
                                    width:100%;
                                    padding:11px;
                                    margin:10px 0;
                                    border:1px solid #ddd;
                                    background:#fff;
                                "
                            >

                            <div
                                class="fm-prov-productos"
                                id="provCatalogo"
                            >

                                ${catalogo.map(p => `

                                    <label
                                        class="fm-prov-producto-opcion"
                                        data-search="${esc(
                                            [
                                                p.nombre,
                                                p.sku,
                                                p.marca,
                                                p.categoria
                                            ].join(' ').toLowerCase()
                                        )}"
                                    >

                                        <input
                                            type="checkbox"
                                            class="prov-check"
                                            value="${Number(p.id)}"
                                        >

                                        ${imagenProducto(p)}

                                        <span>

                                            <strong>
                                                ${esc(p.nombre)}
                                            </strong>

                                            <small>
                                                SKU: ${esc(p.sku)}
                                                · ${esc(
                                                    p.marca || 'Sin marca'
                                                )}
                                                · ${esc(
                                                    p.categoria ||
                                                    'Sin categoría'
                                                )}
                                                ${p.activo
                                                    ? ''
                                                    : ' · Inactivo'}
                                            </small>

                                        </span>

                                    </label>

                                `).join('')}

                            </div>

                            <p
                                id="provSeleccionados"
                                class="fm-prov-aviso"
                            >
                                0 productos seleccionados.
                            </p>

                        </div>

                    </div>

                    <div class="fm-prov-botones">

                        <button
                            id="provGuardar"
                            class="btn"
                            type="submit"
                        >
                            Guardar proveedor
                        </button>

                        <button
                            id="provCancelar"
                            class="btn light"
                            type="button"
                        >
                            Cancelar
                        </button>

                    </div>

                </form>

            </section>

            <!-- DIRECTORIO -->

            <section class="panel fm-prov-panel">

                <div class="fm-prov-busqueda">

                    <h2>Directorio de proveedores</h2>

                    <input
                        type="search"
                        id="provBuscar"
                        placeholder="Buscar proveedor, SKU o producto"
                    >

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Proveedor</th>
                                <th>Contacto</th>
                                <th>Productos</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="provFilas"></tbody>

                    </table>

                </div>

            </section>

            <!-- DETALLE -->

            <section
                class="panel fm-prov-detalle"
                id="provDetalle"
                hidden
            ></section>

        </div>

    `);

    /* ======================================
       SELECCIÓN DE PRODUCTOS
    ====================================== */

    const seleccionados = () => [
        ...document.querySelectorAll(
            '.prov-check:checked'
        )
    ].map(x => Number(x.value));

    const contarSeleccionados = () => {

        const n = seleccionados().length;

        $('#provSeleccionados').textContent =
            `${n} producto${n === 1 ? '' : 's'} ` +
            `seleccionado${n === 1 ? '' : 's'}.`;
    };

    /* ======================================
       MAPA AUTOMÁTICO
    ====================================== */

    function actualizarMapaFormulario() {

        clearTimeout(temporizadorMapa);

        const direccion =
            $('#provDireccion').value.trim();

        const estado = $('#provMapaEstado');

        const mapa = $('#provMapaIframe');

        const enlace = $('#provAbrirMapa');

        if (direccion.length < 12) {

            estado.textContent =
                'Escribe calle, número y localidad ' +
                'para mostrar el marcador.';

            mapa.hidden = true;

            enlace.hidden = true;

            mapa.removeAttribute('src');

            enlace.removeAttribute('href');

            return;
        }

        estado.textContent =
            'Mapa orientativo: comprueba que ' +
            'el marcador coincida con la dirección.';

        enlace.href = mapaExterno(direccion);

        enlace.hidden = false;

        mapa.src = mapaEmbed(direccion);

        mapa.hidden = false;
    }

    $('#provDireccion').addEventListener(
        'input',
        () => {

            clearTimeout(temporizadorMapa);

            temporizadorMapa = setTimeout(
                actualizarMapaFormulario,
                1400
            );
        }
    );

    $('#provDireccion').addEventListener(
        'blur',
        actualizarMapaFormulario
    );

    /* ======================================
       LIMPIAR FORMULARIO
    ====================================== */

    function limpiarFormulario() {

        $('#provForm').reset();

        document.querySelectorAll(
            '.prov-check'
        ).forEach(x => {
            x.checked = false;
        });

        $('#provBuscarProducto').value = '';

        document.querySelectorAll(
            '.fm-prov-producto-opcion'
        ).forEach(x => {
            x.hidden = false;
        });

        contarSeleccionados();

        actualizarMapaFormulario();
    }

    /* ======================================
       NUEVO PROVEEDOR O EDICIÓN
    ====================================== */

    function abrirFormulario(proveedor = null) {

        editando = proveedor
            ? Number(proveedor.id)
            : null;

        limpiarFormulario();

        $('#provFormTitulo').textContent =
            proveedor
                ? 'Editar proveedor'
                : 'Nuevo proveedor';

        $('#provGuardar').textContent =
            proveedor
                ? 'Guardar cambios'
                : 'Registrar proveedor';

        if (proveedor) {

            $('#provNombre').value =
                proveedor.nombre || '';

            $('#provContacto').value =
                proveedor.contacto || '';

            $('#provTelefono').value =
                proveedor.telefono || '';

            $('#provCorreo').value =
                proveedor.correo || '';

            $('#provDireccion').value =
                proveedor.direccion || '';

            $('#provNotas').value =
                proveedor.notas || '';

            const ids = new Set(
                (proveedor.productos || []).map(
                    p => Number(p.id)
                )
            );

            document.querySelectorAll(
                '.prov-check'
            ).forEach(x => {

                x.checked = ids.has(
                    Number(x.value)
                );
            });

            contarSeleccionados();

            actualizarMapaFormulario();
        }

        $('#provFormPanel').hidden = false;

        $('#provFormPanel').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /* ======================================
       MOSTRAR PROVEEDORES
    ====================================== */

    function pintar() {

        const busqueda = $('#provBuscar')
            .value
            .toLowerCase()
            .trim();

        const visibles = proveedores.filter(p => {

            const productos = Array.isArray(p.productos)
                ? p.productos
                : [];

            return [
                p.nombre,
                p.contacto,
                p.correo,
                ...productos.map(x => x.nombre),
                ...productos.map(x => x.sku)
            ]
                .join(' ')
                .toLowerCase()
                .includes(busqueda);
        });

        const productosVinculados = new Set(

            proveedores.flatMap(p =>
                (p.productos || []).map(
                    x => String(x.id)
                )
            )
        );

        $('#provResumen').innerHTML = `

            <article class="fm-prov-cifra">

                <span>Proveedores registrados</span>

                <strong>
                    ${proveedores.length}
                </strong>

                <small>Total del directorio</small>

            </article>

            <article class="fm-prov-cifra">

                <span>Proveedores activos</span>

                <strong>
                    ${proveedores.filter(p => p.activo).length}
                </strong>

                <small>Habilitados</small>

            </article>

            <article class="fm-prov-cifra">

                <span>Productos con proveedor</span>

                <strong>
                    ${productosVinculados.size}
                </strong>

                <small>Productos diferentes</small>

            </article>

        `;

        $('#provFilas').innerHTML = visibles.length
            ? visibles.map(p => `

                <tr>

                    <td>

                        <strong>
                            ${esc(p.nombre)}
                        </strong>

                        <small>
                            ${esc(p.correo || 'Sin correo')}
                        </small>

                    </td>

                    <td>

                        ${esc(
                            p.contacto || 'No indicado'
                        )}

                        <small>
                            ${esc(p.telefono || '')}
                        </small>

                    </td>

                    <td>

                        <span class="fm-prov-pildora">
                            ${(p.productos || []).length}
                            productos
                        </span>

                    </td>

                    <td>

                        <span class="
                            fm-prov-pildora
                            ${p.activo ? '' : 'inactivo'}
                        ">

                            ${p.activo
                                ? 'Activo'
                                : 'Inactivo'}

                        </span>

                    </td>

                    <td>

                        <div class="fm-prov-acciones">

                            <button
                                class="btn light"
                                type="button"
                                data-accion="ver"
                                data-id="${Number(p.id)}"
                            >
                                Ver productos
                            </button>

                            <button
                                class="btn light"
                                type="button"
                                data-accion="editar"
                                data-id="${Number(p.id)}"
                            >
                                Editar
                            </button>

                            <button
                                class="btn light"
                                type="button"
                                data-accion="estado"
                                data-id="${Number(p.id)}"
                            >
                                ${p.activo
                                    ? 'Desactivar'
                                    : 'Activar'}
                            </button>

                        </div>

                    </td>

                </tr>

            `).join('')

            : `
                <tr>
                    <td
                        colspan="5"
                        class="fm-prov-vacio"
                    >
                        No se encontraron proveedores.
                    </td>
                </tr>
            `;
    }

    /* ======================================
       RECARGAR DATOS
    ====================================== */

    async function refrescar() {

        proveedores = await call('/suppliers');

        pintar();
    }

    /* ======================================
       DETALLE DEL PROVEEDOR
       MAPA Y FOTOGRAFÍAS
    ====================================== */

    function verProveedor(p) {

        const detalle = $('#provDetalle');

        const productos = Array.isArray(p.productos)
            ? p.productos
            : [];

        const direccion = String(
            p.direccion || ''
        ).trim();

        detalle.hidden = false;

        detalle.innerHTML = `

            <div class="fm-prov-detalle-cabecera">

                <h2>
                    ${esc(p.nombre)}
                </h2>

                <button
                    class="btn light"
                    type="button"
                    id="provCerrarDetalle"
                >
                    Cerrar
                </button>

            </div>

            <div class="fm-prov-detalle-info">

                <p>
                    <b>Contacto:</b>
                    ${esc(
                        p.contacto || 'No registrado'
                    )}
                </p>

                <p>
                    <b>Teléfono:</b>
                    ${esc(
                        p.telefono || 'No registrado'
                    )}
                </p>

                <p>
                    <b>Correo:</b>
                    ${esc(
                        p.correo || 'No registrado'
                    )}
                </p>

                <p>
                    <b>Dirección:</b>
                    ${esc(
                        direccion || 'No registrada'
                    )}
                </p>

                <p>
                    <b>Notas:</b>
                    ${esc(
                        p.notas || 'Sin notas'
                    )}
                </p>

            </div>

            ${direccion.length >= 12 ? `

                <div class="fm-prov-mapa">

                    <h3>
                        Ubicación del proveedor
                    </h3>

                    <p class="fm-prov-mapa-estado">
                        Vista previa aproximada.
                        Confirma la dirección en Google Maps.
                    </p>

                    <iframe
                        title="Mapa de ${esc(p.nombre)}"
                        src="${esc(mapaEmbed(direccion))}"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                    ></iframe>

                    <a
                        href="${esc(mapaExterno(direccion))}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Abrir en Google Maps
                    </a>

                </div>

            ` : ''}

            <h3 style="margin-top:22px">

                Productos que suministra

                (${productos.length})

            </h3>

            <div class="fm-prov-tarjetas">

                ${productos.length

                    ? productos.map(x => `

                        <article class="fm-prov-tarjeta">

                            ${imagenProducto(x)}

                            <div>

                                <strong>
                                    ${esc(x.nombre)}
                                </strong>

                                <small>
                                    SKU:
                                    ${esc(
                                        x.sku || 'No registrado'
                                    )}
                                </small>

                                <small>
                                    Marca:
                                    ${esc(
                                        x.marca || 'Sin marca'
                                    )}
                                </small>

                            </div>

                        </article>

                    `).join('')

                    : `
                        <p>
                            No hay productos asociados
                            a este proveedor.
                        </p>
                    `
                }

            </div>

        `;

        $('#provCerrarDetalle').onclick = () => {

            detalle.hidden = true;

            detalle.innerHTML = '';
        };

        detalle.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /* ======================================
       EVENTOS DEL FORMULARIO
    ====================================== */

    $('#provNuevo').addEventListener(
        'click',
        () => abrirFormulario()
    );

    $('#provCancelar').addEventListener(
        'click',
        () => {

            $('#provFormPanel').hidden = true;

            editando = null;

            clearTimeout(temporizadorMapa);
        }
    );

    $('#provBuscar').addEventListener(
        'input',
        pintar
    );

    /* ======================================
       BUSCAR PRODUCTOS
    ====================================== */

    $('#provBuscarProducto').addEventListener(
        'input',
        event => {

            const busqueda = event.target.value
                .toLowerCase()
                .trim();

            document.querySelectorAll(
                '.fm-prov-producto-opcion'
            ).forEach(x => {

                x.hidden = !x.dataset.search.includes(
                    busqueda
                );
            });
        }
    );

    $('#provCatalogo').addEventListener(
        'change',
        contarSeleccionados
    );

    /* ======================================
       GUARDAR PROVEEDOR
    ====================================== */

    $('#provForm').addEventListener(
        'submit',
        async event => {

            event.preventDefault();

            const ids = seleccionados();

            if (!ids.length) {

                alert(
                    'Selecciona al menos un producto.'
                );

                return;
            }

            const datos = {

                nombre:
                    $('#provNombre').value.trim(),

                contacto:
                    $('#provContacto').value.trim(),

                telefono:
                    $('#provTelefono').value.trim(),

                correo:
                    $('#provCorreo').value.trim(),

                direccion:
                    $('#provDireccion').value.trim(),

                notas:
                    $('#provNotas').value.trim(),

                productos: ids
            };

            const boton = $('#provGuardar');

            boton.disabled = true;

            try {

                await call(
                    editando
                        ? `/suppliers/${editando}`
                        : '/suppliers',

                    {
                        method: editando
                            ? 'PUT'
                            : 'POST',

                        body: JSON.stringify(datos)
                    }
                );

                await refrescar();

                $('#provFormPanel').hidden = true;

                $('#provDetalle').hidden = true;

                editando = null;

                alert(
                    'Proveedor y productos guardados correctamente.'
                );

            } catch (error) {

                alert(error.message);

            } finally {

                boton.disabled = false;
            }
        }
    );

    /* ======================================
       VER, EDITAR Y CAMBIAR ESTADO
    ====================================== */

    $('#provFilas').addEventListener(
        'click',
        async event => {

            const boton = event.target.closest(
                'button[data-accion]'
            );

            if (!boton) return;

            const proveedor = proveedores.find(
                p =>
                    Number(p.id) ===
                    Number(boton.dataset.id)
            );

            if (!proveedor) return;

            if (boton.dataset.accion === 'ver') {

                verProveedor(proveedor);

            } else if (
                boton.dataset.accion === 'editar'
            ) {

                abrirFormulario(proveedor);

            } else if (
                boton.dataset.accion === 'estado'
            ) {

                if (
                    proveedor.activo &&
                    !confirm(
                        `¿Desactivar a ${proveedor.nombre}? ` +
                        'Sus productos se conservarán.'
                    )
                ) {
                    return;
                }

                boton.disabled = true;

                try {

                    await call(
                        `/suppliers/${proveedor.id}/status`,

                        {
                            method: 'PATCH',

                            body: JSON.stringify({
                                activo: !proveedor.activo
                            })
                        }
                    );

                    await refrescar();

                } catch (error) {

                    alert(error.message);

                    boton.disabled = false;
                }
            }
        }
    );

    pintar();
}
