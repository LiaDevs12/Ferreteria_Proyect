import { call, esc, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

const $ = selector => document.querySelector(selector);

let productos = [];
let reportes = [];

const etiquetas = {
    FALTANTE: 'Faltante',
    SOBRANTE: 'Sobrante',
    PRODUCTO_DANADO: 'Producto dañado',
    ERROR_STOCK: 'Error de stock',
    PRODUCTO_EQUIVOCADO: 'Producto equivocado',
    OTRO: 'Otro'
};

const formatoCantidad = valor =>
    Number(valor || 0).toLocaleString('es-MX', {
        maximumFractionDigits: 3
    });

/* ==========================================
   MENSAJES
========================================== */

function mostrarAviso(mensaje, correcto = false) {
    const nodo = $('#invAviso');

    if (!nodo) return;

    nodo.textContent = mensaje;

    nodo.className = 'notice' +
        (correcto ? ' fm-inv-ok' : '');

    nodo.hidden = false;

    nodo.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
    });
}

/* ==========================================
   INDICADORES
========================================== */

function dibujarResumen() {
    $('#invTotal').textContent = productos.length;

    $('#invSinStock').textContent = productos.filter(
        p => Number(p.stock) <= 0
    ).length;

    $('#invPendientes').textContent = reportes.filter(
        r => ['PENDIENTE', 'EN_REVISION'].includes(
            String(r.estado).toUpperCase()
        )
    ).length;
}

/* ==========================================
   CONSULTAR PRODUCTOS
========================================== */

function dibujarProductos() {
    const buscar = $('#invBuscar')
        .value.trim()
        .toLowerCase();

    const seleccionados = productos.filter(p =>
        [
            p.nombre,
            p.sku,
            p.categoria
        ].some(valor =>
            String(valor || '')
                .toLowerCase()
                .includes(buscar)
        )
    );

    $('#invCantidadResultados').textContent =
        `${Math.min(seleccionados.length, 100)} de ` +
        `${seleccionados.length} coincidencias`;

    $('#invTablaProductos').innerHTML =
        seleccionados.length
            ? seleccionados.slice(0, 100).map(p => {

                const imagenValida =
                    /^(https?:\/\/|\/)/i.test(
                        String(p.imagen || '')
                    );

                return `
                    <tr>
                        <td>
                            <div class="fm-inv-producto">

                                ${imagenValida ? `
                                    <img
                                        src="${esc(p.imagen)}"
                                        alt=""
                                        loading="lazy"
                                    >
                                ` : `
                                    <span class="fm-inv-placeholder">
                                        —
                                    </span>
                                `}

                                <strong>
                                    ${esc(p.nombre)}
                                </strong>
                            </div>
                        </td>

                        <td>${esc(p.sku)}</td>

                        <td>
                            ${esc(p.categoria || 'Sin categoría')}
                        </td>

                        <td>
                            <strong>
                                ${esc(formatoCantidad(p.stock))}
                            </strong>

                            ${esc(p.unidad || '')}
                        </td>

                        <td>
                            <button
                                type="button"
                                class="btn light fm-inv-elegir"
                                data-id="${Number(p.id)}"
                            >
                                Reportar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('')

            : `
                <tr>
                    <td colspan="5" class="fm-inv-vacio">
                        No hay productos que coincidan
                        con la búsqueda.
                    </td>
                </tr>
            `;
}

/* ==========================================
   HISTORIAL DE REPORTES
========================================== */

function fechaTexto(fecha) {
    const d = new Date(fecha);

    return fecha && !Number.isNaN(d.getTime())
        ? d.toLocaleString('es-MX')
        : '—';
}

function dibujarReportes() {
    $('#invTablaReportes').innerHTML =
        reportes.length
            ? reportes.map(r => `
                <tr>
                    <td>
                        <strong>
                            #${Number(r.id)}
                        </strong>
                    </td>

                    <td>
                        ${esc(fechaTexto(r.fecha))}
                    </td>

                    <td>
                        ${esc(r.producto || 'Sin producto')}

                        <small class="fm-inv-muted">
                            ${esc(r.sku || '')}
                        </small>
                    </td>

                    <td>
                        ${esc(etiquetas[r.tipo] || r.tipo)}
                    </td>

                    <td>
                        ${esc(r.prioridad)}
                    </td>

                    <td>
                        <span class="pill">
                            ${esc(r.estado)}
                        </span>
                    </td>
                </tr>
            `).join('')

            : `
                <tr>
                    <td colspan="6" class="fm-inv-vacio">
                        Aún no has creado reportes.
                    </td>
                </tr>
            `;
}

/* ==========================================
   COMPARACIÓN DE EXISTENCIAS
========================================== */

function seleccionado() {
    return productos.find(
        p => String(p.id) === $('#invProductoId').value
    );
}

function actualizarDiferencia() {
    const p = seleccionado();

    const texto = $('#invContada').value;

    $('#invSku').value = p?.sku || '';

    $('#invSistema').value = p
        ? formatoCantidad(p.stock)
        : '';

    if (!p || texto === '') {
        $('#invDiferencia').textContent =
            'Elige un producto e introduce la cantidad contada.';

        return;
    }

    const diferencia =
        Number(texto) - Number(p.stock);

    if (
        !Number.isFinite(diferencia) ||
        Number(texto) < 0
    ) {
        $('#invDiferencia').textContent =
            'Introduce una cantidad física válida.';

    } else if (Math.abs(diferencia) < 0.0000001) {
        $('#invDiferencia').textContent =
            'Sin discrepancia en las cantidades.';

    } else {
        $('#invDiferencia').textContent =
            `Diferencia: ${diferencia > 0 ? '+' : '−'}` +
            `${formatoCantidad(Math.abs(diferencia))} ` +
            `(${diferencia > 0 ? 'sobrante' : 'faltante'}).`;
    }
}

/* ==========================================
   FOTOGRAFÍAS
========================================== */

function leerFoto(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();

        lector.onload = () =>
            resolve(lector.result);

        lector.onerror = () =>
            reject(new Error(
                'No se pudo leer la fotografía.'
            ));

        lector.readAsDataURL(archivo);
    });
}

/* ==========================================
   RECARGAR REPORTES
========================================== */

async function cargarHistorial() {
    reportes = await call('/inventory/my-reports');

    dibujarReportes();
    dibujarResumen();
}

/* ==========================================
   NAVEGACIÓN EN EL MENÚ ORIGINAL
========================================== */

function resaltarEnMenu() {
    const fragmentos = [
        '#productos',
        '#nuevo-reporte',
        '#mis-reportes'
    ];

    const actual = fragmentos.includes(location.hash)
        ? location.hash
        : '#productos';

    document.querySelectorAll(
        '.side .nav a[href^="inventario.html#"]'
    ).forEach(enlace => {
        const url = new URL(
            enlace.href,
            location.href
        );

        enlace.classList.toggle(
            'active',
            url.hash === actual
        );
    });

    if (fragmentos.includes(location.hash)) {
        document.querySelector(
            location.hash
        )?.scrollIntoView({
            block: 'start'
        });
    }
}

/* ==========================================
   INICIALIZACIÓN
========================================== */

async function iniciar() {
    try {
        if (!await guard()) return;

        if (me.rol !== 'INVENTARIO') {
            location.href = 'dashboard.html';
            return;
        }

        // Utilizar el layout ORIGINAL de FerroMax.
        // No se crea otra barra lateral.

        layout(
            'Control de inventario',
            'inventory',
            `
            <div id="ferromaxInventory">

                <h1>Control de inventario</h1>

                <p class="sub">
                    Consulta los productos, verifica existencias
                    y reporta las discrepancias al administrador.
                </p>

                <div
                    id="invAviso"
                    class="notice"
                    hidden
                    role="status"
                    aria-live="polite"
                ></div>

                <!-- INDICADORES -->

                <div class="grid fm-inv-estadisticas">

                    <div class="stat">
                        <small>Productos registrados</small>
                        <strong id="invTotal">—</strong>
                    </div>

                    <div class="stat">
                        <small>Productos sin existencia</small>
                        <strong id="invSinStock">—</strong>
                    </div>

                    <div class="stat">
                        <small>Mis reportes pendientes</small>
                        <strong id="invPendientes">—</strong>
                    </div>

                </div>

                <!-- PRODUCTOS -->

                <section
                    id="productos"
                    class="panel fm-inv-seccion"
                >

                    <h2>Consultar productos</h2>

                    <p class="fm-inv-ayuda">
                        Consulta de solo lectura.
                        Busca un producto por nombre,
                        categoría o SKU. No podrás modificar
                        sus existencias.
                    </p>

                    <div class="field fm-inv-buscador">

                        <label for="invBuscar">
                            Buscar producto o SKU
                        </label>

                        <input
                            id="invBuscar"
                            type="search"
                            placeholder="Escribe el nombre, la categoría o el SKU"
                        >

                    </div>

                    <div class="table-wrap">

                        <table>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>SKU</th>
                                    <th>Categoría</th>
                                    <th>Existencia</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>

                            <tbody id="invTablaProductos">
                                <tr>
                                    <td
                                        colspan="5"
                                        class="fm-inv-vacio"
                                    >
                                        Cargando productos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                    </div>

                    <p
                        id="invCantidadResultados"
                        class="fm-inv-ayuda fm-inv-contador"
                    ></p>

                </section>

                <!-- CREAR REPORTE -->

                <section
                    id="nuevo-reporte"
                    class="panel fm-inv-seccion"
                >

                    <h2>Crear reporte de inventario</h2>

                    <p class="fm-inv-ayuda">
                        Selecciona el producto y registra
                        el resultado de tu verificación física.
                        El administrador recibirá el reporte
                        como pendiente.
                    </p>

                    <form id="invFormulario">

                        <div class="form-grid">

                            <div class="field full">
                                <label for="invProductoId">
                                    Producto *
                                </label>

                                <select
                                    id="invProductoId"
                                    required
                                >
                                    <option value="">
                                        Selecciona un producto
                                    </option>
                                </select>
                            </div>

                            <div class="field">
                                <label for="invSku">
                                    SKU
                                </label>

                                <input
                                    id="invSku"
                                    readonly
                                >
                            </div>

                            <div class="field">
                                <label for="invSistema">
                                    Cantidad registrada en el sistema
                                </label>

                                <input
                                    id="invSistema"
                                    readonly
                                >
                            </div>

                            <div class="field">
                                <label for="invContada">
                                    Cantidad contada físicamente *
                                </label>

                                <input
                                    id="invContada"
                                    type="number"
                                    min="0"
                                    max="99999999"
                                    step="0.001"
                                    required
                                >
                            </div>

                            <div class="field">
                                <label for="invTipo">
                                    Tipo de incidencia *
                                </label>

                                <select
                                    id="invTipo"
                                    required
                                >
                                    <option value="">
                                        Selecciona una opción
                                    </option>

                                    <option value="FALTANTE">
                                        Faltante
                                    </option>

                                    <option value="SOBRANTE">
                                        Sobrante
                                    </option>

                                    <option value="PRODUCTO_DANADO">
                                        Producto dañado
                                    </option>

                                    <option value="ERROR_STOCK">
                                        Error de stock
                                    </option>

                                    <option value="PRODUCTO_EQUIVOCADO">
                                        Producto equivocado
                                    </option>

                                    <option value="OTRO">
                                        Otro
                                    </option>
                                </select>
                            </div>

                            <div class="field">
                                <label for="invPrioridad">
                                    Prioridad *
                                </label>

                                <select
                                    id="invPrioridad"
                                    required
                                >
                                    <option value="BAJA">
                                        Baja
                                    </option>

                                    <option
                                        value="MEDIA"
                                        selected
                                    >
                                        Media
                                    </option>

                                    <option value="ALTA">
                                        Alta
                                    </option>

                                    <option value="CRITICA">
                                        Crítica
                                    </option>
                                </select>
                            </div>

                        <div class="field">

    <label for="invFoto">
        Fotografía de evidencia
        (opcional, máximo 5 MB)
    </label>

    <input
        id="invFoto"
        type="file"
        accept="image/jpeg,image/png,image/webp"
    >

    <!-- VISTA PREVIA DE LA FOTOGRAFÍA -->

    <div
        id="invFotoVista"
        hidden
        style="
            margin-top: 15px;
            padding: 15px;
            border: 1px solid #dddddd;
            background: #fafafa;
        "
    >

        <p style="
            margin: 0 0 12px;
            font-size: 13px;
            font-weight: 700;
            color: #333333;
        ">
            Vista previa de la evidencia
        </p>

        <img
            id="invFotoMiniatura"
            alt="Vista previa de la evidencia"
            style="
                display: block;
                width: 180px;
                height: 160px;
                max-width: 100%;
                object-fit: contain;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                margin-bottom: 10px;
            "
        >

        <p
            id="invFotoNombre"
            style="
                font-size: 12px;
                color: #666666;
                margin: 0 0 12px;
                overflow-wrap: anywhere;
            "
        ></p>

        <button
            type="button"
            id="invQuitarFoto"
            class="btn light"
        >
            Quitar fotografía
        </button>

    </div>

</div>

                            <div class="field full">
                                <label for="invDescripcion">
                                    Descripción de la incidencia *
                                </label>

                                <textarea
                                    id="invDescripcion"
                                    minlength="10"
                                    maxlength="2000"
                                    required
                                    placeholder="Describe la discrepancia, el lugar de revisión y cualquier observación."
                                ></textarea>
                            </div>

                        </div>

                        <div
                            class="fm-inv-diferencia"
                            id="invDiferencia"
                        >
                            Elige un producto e introduce
                            la cantidad contada.
                        </div>

                        <div class="actions">
                            <button
                                type="submit"
                                id="invEnviar"
                                class="btn"
                            >
                                Enviar reporte al administrador
                            </button>
                        </div>

                    </form>

                </section>

                <!-- MIS REPORTES -->

                <section
                    id="mis-reportes"
                    class="panel fm-inv-seccion"
                >

                    <h2>Mis reportes</h2>

                    <p class="fm-inv-ayuda">
                        Consulta el estado de los reportes
                        que has enviado. Su resolución
                        corresponde al administrador.
                    </p>

                    <div class="table-wrap">

                        <table>
                            <thead>
                                <tr>
                                    <th>Folio</th>
                                    <th>Fecha</th>
                                    <th>Producto / SKU</th>
                                    <th>Incidencia</th>
                                    <th>Prioridad</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>

                            <tbody id="invTablaReportes">
                                <tr>
                                    <td
                                        colspan="6"
                                        class="fm-inv-vacio"
                                    >
                                        Cargando reportes...
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                    </div>

                </section>

            </div>
            `
        );

        /* ==================================
           EVENTOS DE PRODUCTOS
        ================================== */

        $('#invBuscar').addEventListener(
            'input',
            dibujarProductos
        );

        $('#invProductoId').addEventListener(
            'change',
            actualizarDiferencia
        );

        $('#invContada').addEventListener(
            'input',
            actualizarDiferencia
        );

        /* ==========================================
   VISTA PREVIA DE EVIDENCIA FOTOGRÁFICA
========================================== */

let urlFotoTemporal = null;

/* ======================================
   LIMPIAR VISTA PREVIA
====================================== */

function limpiarVistaFoto() {

    if (urlFotoTemporal) {

        URL.revokeObjectURL(
            urlFotoTemporal
        );

        urlFotoTemporal = null;
    }

    $('#invFotoMiniatura').removeAttribute(
        'src'
    );

    $('#invFotoNombre').textContent = '';

    $('#invFotoVista').hidden = true;
}

/* ======================================
   MOSTRAR FOTOGRAFÍA SELECCIONADA
====================================== */

$('#invFoto').addEventListener(
    'change',
    function () {

        limpiarVistaFoto();

        const archivo = this.files?.[0];

        if (!archivo) {
            return;
        }

        /* ==============================
           VALIDAR FORMATO
        ============================== */

        const formatosPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (
            !formatosPermitidos.includes(
                archivo.type
            )
        ) {

            mostrarAviso(
                'Solo se permiten imágenes JPG, PNG o WEBP.'
            );

            this.value = '';

            return;
        }

        /* ==============================
           VALIDAR TAMAÑO
        ============================== */

        const maximo = 5 * 1024 * 1024;

        if (archivo.size > maximo) {

            mostrarAviso(
                'La fotografía no debe superar los 5 MB.'
            );

            this.value = '';

            return;
        }

        /* ==============================
           GENERAR MINIATURA
        ============================== */

        urlFotoTemporal = URL.createObjectURL(
            archivo
        );

        $('#invFotoMiniatura').src =
            urlFotoTemporal;

        $('#invFotoNombre').textContent =
            archivo.name;

        $('#invFotoVista').hidden = false;

    }
);

/* ======================================
   QUITAR FOTOGRAFÍA
====================================== */

$('#invQuitarFoto').addEventListener(
    'click',
    function () {

        $('#invFoto').value = '';

        limpiarVistaFoto();

    }
);

/* ======================================
   LIBERAR MEMORIA AL SALIR
====================================== */

window.addEventListener(
    'pagehide',
    limpiarVistaFoto
);

        $('#invTablaProductos').addEventListener(
            'click',
            event => {
                const boton = event.target.closest(
                    '.fm-inv-elegir'
                );

                if (!boton) return;

                $('#invProductoId').value =
                    boton.dataset.id;

                actualizarDiferencia();

                location.hash = '#nuevo-reporte';

                $('#nuevo-reporte').scrollIntoView({
                    block: 'start',
                    behavior: 'smooth'
                });

                resaltarEnMenu();

                $('#invContada').focus({
                    preventScroll: true
                });
            }
        );

        /* ==================================
           ENVIAR REPORTE
        ================================== */

        $('#invFormulario').addEventListener(
            'submit',
            async event => {
                event.preventDefault();

                const p = seleccionado();

                if (!p) {
                    mostrarAviso(
                        'Selecciona un producto válido.'
                    );

                    return;
                }

                const boton = $('#invEnviar');
                const foto = $('#invFoto').files[0];

                if (
                    foto &&
                    (
                        ![
                            'image/jpeg',
                            'image/png',
                            'image/webp'
                        ].includes(foto.type) ||
                        foto.size > 5 * 1024 * 1024
                    )
                ) {
                    mostrarAviso(
                        'La evidencia debe ser JPG, PNG o WEBP ' +
                        'y pesar máximo 5 MB.'
                    );

                    return;
                }

                if (!confirm(
                    `¿Enviar al administrador el reporte del SKU ${p.sku}?`
                )) {
                    return;
                }

                boton.disabled = true;

                try {
                    const resultado = await call(
                        '/inventory/reports',
                        {
                            method: 'POST',

                            body: JSON.stringify({
                                productoId: Number(p.id),

                                cantidadContada: Number(
                                    $('#invContada').value
                                ),

                                tipo: $('#invTipo').value,

                                prioridad:
                                    $('#invPrioridad').value,

                                descripcion:
                                    $('#invDescripcion')
                                        .value.trim(),

                                foto: foto
                                    ? await leerFoto(foto)
                                    : null
                            })
                        }
                    );

                    $('#invFormulario').reset();

limpiarVistaFoto();

actualizarDiferencia();

                    await cargarHistorial();

                    mostrarAviso(
                        `Reporte #${resultado.id} enviado ` +
                        'al administrador. Estado: PENDIENTE.',
                        true
                    );

                } catch (error) {
                    mostrarAviso(error.message);

                } finally {
                    boton.disabled = false;
                }
            }
        );

        /* ==================================
           NAVEGACIÓN
        ================================== */

        window.addEventListener(
            'hashchange',
            resaltarEnMenu
        );

        /* ==================================
           CARGAR DATOS REALES
        ================================== */

        const [
            listaProductos,
            listaReportes
        ] = await Promise.all([
            call('/inventory/products'),
            call('/inventory/my-reports')
        ]);

        productos = Array.isArray(listaProductos)
            ? listaProductos
            : [];

        reportes = Array.isArray(listaReportes)
            ? listaReportes
            : [];

        $('#invProductoId').innerHTML =
            '<option value="">Selecciona un producto</option>' +

            productos.map(p => `
                <option value="${Number(p.id)}">
                    ${esc(p.sku)} — ${esc(p.nombre)}
                </option>
            `).join('');

        dibujarProductos();
        dibujarReportes();
        dibujarResumen();

        requestAnimationFrame(resaltarEnMenu);

    } catch (error) {
        if ($('#invAviso')) {
            mostrarAviso(error.message);
        } else {
            console.error(
                'Error al cargar el inventario:',
                error
            );
        }
    }
}

iniciar();