
import { call, esc, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

const $ = selector => document.querySelector(selector);

const permitidos = ['ADMINISTRADOR', 'EDITOR'];

async function acceso() {
    if (!await guard()) return false;

    if (!permitidos.includes(me.rol)) {
        location.href = 'dashboard.html';
        return false;
    }

    return true;
}


function estilos() {
    if (document.getElementById('fm-editor-catalogo-css')) return;

    const style = document.createElement('style');
    style.id = 'fm-editor-catalogo-css';

    style.textContent = `
        /* DISEÑO GENERAL */
        .fm-editor-catalogo {
            width: 100%;
            max-width: 1450px;
            margin: 0 auto;
            padding-bottom: 38px;
            color: var(--ink, #252329);
            animation: fmAppear .35s ease;
        }

        /* ENCABEZADO */
        .fm-editor-catalogo .fm-editor-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            position: relative;
            overflow: hidden;
            padding: 25px 26px;
            margin-bottom: 22px;
            background: linear-gradient(
                115deg,
                #ffffff 15%,
                #fff0f3 100%
            );
            border: 1px solid #efdee3;
            border-radius: 16px;
            box-shadow: var(
                --shadow,
                0 8px 30px rgba(30, 24, 28, .055)
            );
        }

        .fm-editor-catalogo .fm-editor-head::before {
            content: '';
            position: absolute;
            left: 0;
            top: 17px;
            bottom: 17px;
            width: 4px;
            border-radius: 0 5px 5px 0;
            background: var(--wine, #c8102e);
        }

        .fm-editor-catalogo .fm-editor-head h1 {
            margin: 5px 0 8px;
            color: #26232a;
        }

        .fm-editor-catalogo .fm-editor-head .sub {
            margin: 0;
            max-width: 650px;
        }

        .fm-editor-catalogo .fm-editor-kicker {
            display: block;
            margin-bottom: 6px;
            color: var(--wine, #c8102e);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.7px;
        }

        /* TARJETAS */
        .fm-editor-catalogo > section.panel {
            margin: 0 0 22px;
            padding: 24px;
            border: 1px solid #eae9ed;
            border-radius: 16px;
            box-shadow: var(
                --shadow,
                0 8px 30px rgba(30, 24, 28, .055)
            );
        }

        /* FORMULARIO DE MARCAS: ROSA SUAVE */
        .fm-editor-catalogo #fmBrandFormBox {
            background: linear-gradient(
                145deg,
                #fff7f9,
                #ffffff 78%
            );
            border-color: #f1dce2;
        }

        /* FORMULARIO DE CATEGORÍAS: TONO CREMA */
        .fm-editor-catalogo #fmCatFormBox {
            background: linear-gradient(
                145deg,
                #fff9f5,
                #ffffff 78%
            );
            border-color: #efdfd7;
        }

        /* LISTADOS: TARJETAS BLANCAS */
        .fm-editor-catalogo > section.panel:last-of-type {
            background: #ffffff;
        }

        .fm-editor-catalogo > section.panel h2 {
            color: #302c33;
        }

        /* FORMULARIOS */
        .fm-editor-form-grid {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 17px;
        }

        .fm-editor-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #625e66;
        }

        .fm-editor-field input,
        .fm-editor-field textarea {
            width: 100%;
            min-width: 0;
            padding: 12px 13px;
            border: 1px solid #e4e2e7;
            border-radius: 9px;
            outline: none;
            background: #ffffff;
            color: #302d33;
            font: inherit;
            font-size: 13px;
            font-weight: 400;
            transition:
                border-color .2s,
                box-shadow .2s;
        }

        .fm-editor-field textarea {
            min-height: 100px;
            resize: vertical;
        }

        .fm-editor-field input:focus,
        .fm-editor-field textarea:focus {
            border-color: var(--wine, #c8102e);
            box-shadow:
                0 0 0 3px rgba(200, 16, 46, .09);
        }

        /* SELECCIÓN DE LOGOTIPO */
        .fm-editor-field input[type='file'] {
            padding: 8px;
            background: #ffffff;
        }

        .fm-editor-field input[type='file']::file-selector-button {
            margin-right: 11px;
            padding: 9px 12px;
            border: 1px solid #eccbd3;
            border-radius: 8px;
            background: #fcecef;
            color: var(--wine, #c8102e);
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }

        .fm-editor-full {
            grid-column: 1 / -1;
        }

        .fm-editor-buttons {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
        }

        /* CATEGORÍAS SELECCIONABLES DE UNA MARCA */
        .fm-editor-checks {
            display: grid;
            grid-template-columns:
                repeat(3, minmax(0, 1fr));
            gap: 10px;
            max-height: 260px;
            overflow-y: auto;
            padding: 14px;
            margin-top: 11px;
            background: #fdf5f7;
            border: 1px solid #f0dce2;
            border-radius: 12px;
        }

        .fm-editor-checks label {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            padding: 10px 11px;
            border: 1px solid #eee1e5;
            border-radius: 9px;
            background: #ffffff;
            color: #514b52;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
        }

        .fm-editor-checks label:hover {
            background: #fff0f4;
            border-color: #e9b7c2;
        }

        .fm-editor-checks input[type='checkbox'] {
            width: auto;
            flex: 0 0 auto;
            accent-color: var(--wine, #c8102e);
        }

        /* OPCIÓN QUITAR LOGOTIPO */
        .fm-editor-catalogo #fmRemoveLogoWrap {
            align-items: center;
            gap: 8px;
            color: #625e66;
            font-weight: 600;
        }

        .fm-editor-catalogo #fmRemoveLogoWrap input {
            accent-color: var(--wine, #c8102e);
        }

        /* ENCABEZADO DEL LISTADO Y BUSCADOR */
        .fm-editor-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 14px;
            padding: 16px 18px;
            margin-bottom: 20px;
            border: 1px solid #f0e9eb;
            border-radius: 12px;
            background: #faf8f9;
        }

        .fm-editor-catalogo .fm-editor-toolbar h2 {
            margin: 0;
        }

        .fm-editor-toolbar input {
            width: min(360px, 100%);
            min-width: 0;
            padding: 11px 13px;
            background: #ffffff;
            border: 1px solid #e4e2e7;
            border-radius: 9px;
            outline: none;
            color: #302d33;
            font: inherit;
            font-size: 13px;
        }

        .fm-editor-toolbar input:focus {
            border-color: var(--wine, #c8102e);
            box-shadow:
                0 0 0 3px rgba(200, 16, 46, .09);
        }

        /* TABLAS */
        .fm-editor-catalogo .table-wrap {
            border: 1px solid #ecebf0;
            border-radius: 12px;
            overflow-x: auto;
        }

        .fm-editor-catalogo table {
            width: 100%;
            background: #ffffff;
        }

        .fm-editor-catalogo tbody tr:hover {
            background: #fff8fa;
        }

        .fm-editor-catalogo td {
            vertical-align: middle;
        }

        /* TABLA DE MARCAS */
        .fm-brands-table {
            width: 100%;
            min-width: 680px;
            table-layout: fixed;
        }

        .fm-brands-table th,
        .fm-brands-table td {
            white-space: normal;
            overflow-wrap: anywhere;
            vertical-align: middle;
        }

        .fm-brands-table th:nth-child(1) {
            width: 87px;
        }

        .fm-brands-table th:nth-child(2) {
            width: 23%;
        }

        .fm-brands-table th:nth-child(3) {
            width: auto;
        }

        .fm-brands-table th:nth-child(4) {
            width: 105px;
        }

        .fm-brands-table th:nth-child(5) {
            width: 150px;
        }

        /* CATEGORÍAS EN VERTICAL */
        .fm-brand-category-list {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
        }

        .fm-brand-category-item {
            display: inline-block;
            max-width: 100%;
            padding: 5px 9px;
            border: 1px solid #f0d9e0;
            border-radius: 8px;
            background: #fff4f6;
            color: #6c3b48;
            font-size: 12px;
            line-height: 1.45;
            overflow-wrap: anywhere;
        }

        /* BOTONES EDITAR Y ACTIVAR/DESACTIVAR */
        .fm-editor-actions {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 7px;
        }

        .fm-editor-actions .btn {
            width: 100%;
            white-space: normal;
            border-radius: 9px;
        }

        /* LOGOTIPOS EN LA TABLA */
        .fm-editor-photo {
            display: block;
            width: 64px;
            height: 64px;
            padding: 5px;
            object-fit: contain;
            background: #ffffff;
            border: 1px solid #e7dce0;
            border-radius: 10px;
        }

        /* ESTADOS ACTIVOS E INACTIVOS */
        .fm-editor-status {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 7px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
        }

        .fm-editor-status::before {
            content: '';
            width: 7px;
            height: 7px;
            flex: 0 0 auto;
            border-radius: 50%;
            background: currentColor;
        }

        .fm-editor-status.on {
            color: #137548;
            background: #e9f8ef;
            border: 1px solid #bce8ce;
        }

        .fm-editor-status.off {
            color: var(--wine, #c8102e);
            background: #fcecef;
            border: 1px solid #f1c7ce;
        }

        /* MENSAJES */
        .fm-editor-message {
            margin: 0 0 20px;
            padding: 13px 15px;
            border: 1px solid #f2d5da;
            border-left: 4px solid var(--wine, #c8102e);
            border-radius: 10px;
            background: #fff1f3;
            color: #a90d26;
            font-size: 12px;
            font-weight: 600;
        }

        /* MINIATURA DEL LOGOTIPO */
        .fm-brand-logo-preview {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-top: 13px;
            padding: 14px;
            border: 1px solid #f0dce2;
            border-radius: 13px;
            background: linear-gradient(
                135deg,
                #ffffff,
                #fff2f5
            );
        }

        .fm-brand-logo-preview-box {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 110px;
            width: 110px;
            height: 110px;
            overflow: hidden;
            border: 1px solid #e8dfe2;
            border-radius: 11px;
            background: #ffffff;
        }

        .fm-brand-logo-preview-box img {
            width: 100%;
            height: 100%;
            padding: 8px;
            object-fit: contain;
        }

        .fm-brand-logo-preview-box span {
            color: #99939b;
            font-size: 12px;
            text-align: center;
        }

        .fm-brand-logo-preview-info {
            display: flex;
            flex-direction: column;
            gap: 7px;
            min-width: 0;
            font-size: 12px;
            font-weight: 400;
            color: #77737b;
            line-height: 1.5;
        }

        .fm-brand-logo-preview-info strong {
            font-size: 13px;
            font-weight: 800;
            color: var(--wine, #c8102e);
        }

        /* ELEMENTOS OCULTOS */
        .fm-editor-catalogo [hidden],
        .fm-brand-logo-preview-box [hidden] {
            display: none !important;
        }

        /* RESPONSIVE */
        @media (max-width: 950px) {
            .fm-editor-checks {
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 750px) {
            .fm-editor-catalogo .fm-editor-head {
                align-items: flex-start;
                flex-direction: column;
                padding: 20px;
            }

            .fm-editor-form-grid,
            .fm-editor-checks {
                grid-template-columns: 1fr;
            }

            .fm-editor-toolbar {
                flex-direction: column;
                align-items: stretch;
            }

            .fm-editor-toolbar input {
                width: 100%;
            }

            .fm-editor-catalogo > section.panel {
                padding: 18px;
            }
        }

        @media (max-width: 460px) {
            .fm-brand-logo-preview {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    `;

    document.head.appendChild(style);
}


function avisar(message) {
    const box = $('#fmEditorMsg');

    if (!box) return;

    box.textContent = message;
    box.hidden = false;

    box.scrollIntoView({
        block: 'nearest'
    });
}

function leerFoto(file) {
    if (!file) {
        return Promise.resolve(null);
    }

    const tipos = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!tipos.includes(file.type)) {
        return Promise.reject(
            new Error(
                'Utiliza una imagen JPG, PNG o WEBP.'
            )
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        return Promise.reject(
            new Error(
                'El logotipo debe pesar menos de 5 MB.'
            )
        );
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve(String(reader.result));
        };

        reader.onerror = () => {
            reject(
                new Error(
                    'No se pudo leer el logotipo.'
                )
            );
        };

        reader.readAsDataURL(file);
    });
}

/* ==========================================
   ADMINISTRACIÓN DE MARCAS
========================================== */

export async function manageBrands() {
    if (!await acceso()) return;

    estilos();

    const [marcasIniciales, categorias] =
        await Promise.all([
            call('/brands'),
            call('/categories')
        ]);

    if (
        !Array.isArray(marcasIniciales) ||
        !Array.isArray(categorias)
    ) {
        throw new Error(
            'La API no devolvió las marcas y categorías.'
        );
    }

    let marcas = marcasIniciales;
    let editId = null;
    let logoActual = '';

    layout('Marcas', 'brands', `
        <div class="fm-editor-catalogo">
<div class="fm-products-heading">

    <div>

        <span class="fm-eyebrow">
            ADMINISTRACIÓN DEL CATÁLOGO
        </span>

        <h1>Marcas</h1>

        <p class="sub">
            Administra las marcas, sus logotipos
            y las categorías asociadas.
        </p>

    </div>

    <button
        class="btn"
        type="button"
        id="fmBrandNew"
    >
        Agregar marca
    </button>

</div>

            <div
                id="fmEditorMsg"
                class="fm-editor-message"
                hidden
            ></div>

            <section
                class="panel"
                id="fmBrandFormBox"
                hidden
            >
                <h2 id="fmBrandFormTitle">
                    Nueva marca
                </h2>

                <form id="fmBrandForm">
                    <div class="fm-editor-form-grid">

                        <label class="fm-editor-field">
                            Nombre de la marca *

                            <input
                                id="fmBrandName"
                                maxlength="100"
                                minlength="2"
                                required
                            >
                        </label>

                        <label class="fm-editor-field">
                            Logotipo (JPG, PNG, WEBP, máx. 5 MB)
<input
    id="fmBrandLogo"
    type="file"
    accept="image/png,image/jpeg,image/webp"
>

<div
    id="fmBrandLogoPreview"
    class="fm-brand-logo-preview"
>
    <div class="fm-brand-logo-preview-box">
        <img
            id="fmBrandLogoImage"
            alt="Vista previa del logotipo"
            hidden
        >

        <span id="fmBrandLogoEmpty">
            Sin imagen
        </span>
    </div>

    <div class="fm-brand-logo-preview-info">
        <strong id="fmBrandLogoTitle">
            Vista previa del logotipo
        </strong>

        <span>
            La imagen se actualizará al seleccionar
            un archivo.
        </span>
    </div>
</div>
                        </label>

                        <label class="fm-editor-field fm-editor-full">
                            Descripción

                            <textarea
                                id="fmBrandDesc"
                                maxlength="255"
                            ></textarea>
                        </label>

                        <div class="fm-editor-full">
                            <strong>
                                Categorías de la marca *
                            </strong>

                            <p class="sub">
                                Selecciona una o varias
                                categorías para asociarlas.
                            </p>

                            <div
                                id="fmBrandCategories"
                                class="fm-editor-checks"
                            >
                                ${
                                    categorias
                                        .filter(c =>
                                            Number(c.activo) === 1
                                        )
                                        .map(c => `
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="fmBrandCat"
                                                    value="${Number(c.id)}"
                                                >
                                                ${esc(c.nombre)}
                                            </label>
                                        `).join('')
                                    ||
                                    'No hay categorías activas.'
                                }
                            </div>
                        </div>

                        <label
                            id="fmRemoveLogoWrap"
                            class="fm-editor-full"
                            hidden
                        >
                            <input
                                id="fmRemoveLogo"
                                type="checkbox"
                            >
                            Quitar logotipo actual
                        </label>

                    </div>

                    <div class="fm-editor-buttons">
                        <button
                            class="btn"
                            type="submit"
                            id="fmBrandSave"
                        >
                            Guardar marca
                        </button>

                        <button
                            class="btn light"
                            type="button"
                            id="fmBrandCancel"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </section>

            <section class="panel">

                <div class="fm-editor-toolbar">
                    <h2>Marcas registradas</h2>

                    <input
                        id="fmBrandSearch"
                        type="search"
                        placeholder="Buscar marca"
                    >
                </div>

                <div class="table-wrap">
                  <table class="fm-brands-table">
                        <thead>
                            <tr>
                                <th>Logo</th>
                                <th>Marca</th>
                                <th>Categorías</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="fmBrandRows"></tbody>
                    </table>
                </div>
            </section>

        </div>
    `);

    const catMap = new Map(
        categorias.map(c => [
            Number(c.id),
            c.nombre
        ])
    );

    const formBox = $('#fmBrandFormBox');

    /* ==========================================
   VISTA PREVIA DEL LOGOTIPO
========================================== */

function actualizarMiniaturaMarca(
    imagen = '',
    titulo = 'Vista previa del logotipo'
) {
    const preview = $('#fmBrandLogoImage');
    const empty = $('#fmBrandLogoEmpty');
    const title = $('#fmBrandLogoTitle');

    if (!preview || !empty || !title) {
        return;
    }

    if (imagen) {
        preview.src = imagen;
        preview.hidden = false;
        empty.hidden = true;
    } else {
        preview.removeAttribute('src');
        preview.hidden = true;
        empty.hidden = false;
    }

    title.textContent = titulo;
}

/* AL SELECCIONAR UNA IMAGEN */

$('#fmBrandLogo').addEventListener(
    'change',
    async event => {
        const file = event.target.files[0];

        if (!file) {
            actualizarMiniaturaMarca(
                logoActual,
                logoActual
                    ? 'Logotipo actual'
                    : 'Sin logotipo'
            );

            return;
        }

        try {
            const imagen = await leerFoto(file);

            $('#fmRemoveLogo').checked = false;

            actualizarMiniaturaMarca(
                imagen,
                'Nuevo logotipo seleccionado'
            );

        } catch (error) {
            event.target.value = '';

            actualizarMiniaturaMarca(
                logoActual,
                logoActual
                    ? 'Logotipo actual'
                    : 'Sin logotipo'
            );

            avisar(error.message);
        }
    }
);

/* AL QUITAR EL LOGOTIPO */

$('#fmRemoveLogo').addEventListener(
    'change',
    event => {
        if (event.target.checked) {
            $('#fmBrandLogo').value = '';

            actualizarMiniaturaMarca(
                '',
                'Logotipo marcado para eliminar'
            );
        } else {
            actualizarMiniaturaMarca(
                logoActual,
                logoActual
                    ? 'Logotipo actual'
                    : 'Sin logotipo'
            );
        }
    }
);

    function render() {
        const q = $('#fmBrandSearch')
            .value
            .trim()
            .toLocaleLowerCase('es');

        const list = marcas.filter(m =>
            String(m.nombre)
                .toLocaleLowerCase('es')
                .includes(q)
        );

        $('#fmBrandRows').innerHTML = list.length
            ? list.map(m => {
                const activo =
                    Number(m.activo) === 1;

                const names = (
                    m.categorias || []
                ).map(id =>
                    catMap.get(Number(id)) ||
                    `ID ${id}`
                );

                return `
                    <tr>
                        <td>
                            ${m.logo_url ? `
                                <img
                                    class="fm-editor-photo"
                                    src="${esc(m.logo_url)}"
                                    alt="Logo de ${esc(m.nombre)}"
                                >
                            ` : 'Sin logo'}
                        </td>

                        <td>
                            <strong>${esc(m.nombre)}</strong>
                            <br>
                            <small>
                                ${esc(m.descripcion || '')}
                            </small>
                        </td>

                    <td>
    <div class="fm-brand-category-list">
        ${
            names.length
                ? names.map(nombre => `
                    <div class="fm-brand-category-item">
                        ${esc(nombre)}
                    </div>
                `).join('')
                : '<span>Sin categorías</span>'
        }
    </div>
</td>

                        <td>
                            <span class="fm-editor-status ${
                                activo ? 'on' : 'off'
                            }">
                                ${activo ? 'Activa' : 'Inactiva'}
                            </span>
                        </td>

                        <td>
                            <div class="fm-editor-actions">
                                <button
                                    class="btn light"
                                    data-action="edit"
                                    data-id="${Number(m.id)}"
                                >
                                    Editar
                                </button>

                                <button
                                    class="btn light"
                                    data-action="status"
                                    data-id="${Number(m.id)}"
                                >
                                    ${activo ? 'Desactivar' : 'Activar'}
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('')
            : `
                <tr>
                    <td colspan="5">
                        No se encontraron marcas.
                    </td>
                </tr>
            `;
    }

    function abrir(m = null) {
    editId = m ? Number(m.id) : null;

    logoActual = m?.logo_url || '';

    $('#fmBrandForm').reset();

    $('#fmBrandName').value =
        m?.nombre || '';

    $('#fmBrandDesc').value =
        m?.descripcion || '';

    $('#fmBrandFormTitle').textContent =
        m ? 'Editar marca' : 'Agregar marca';

    $('#fmBrandSave').textContent =
        m ? 'Guardar cambios' : 'Registrar marca';

    $('#fmRemoveLogoWrap').hidden =
        !logoActual;

    const ids = new Set(
        (m?.categorias || []).map(Number)
    );

    document.querySelectorAll(
        'input[name="fmBrandCat"]'
    ).forEach(check => {
        check.checked = ids.has(
            Number(check.value)
        );
    });

    /* MOSTRAR LOGOTIPO ACTUAL */

    actualizarMiniaturaMarca(
        logoActual,
        logoActual
            ? 'Logotipo actual'
            : 'Sin logotipo'
    );

    formBox.hidden = false;

    formBox.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

    async function refrescar() {
        marcas = await call('/brands');
        render();
    }

    $('#fmBrandNew').onclick = () => abrir();

    $('#fmBrandCancel').onclick = () => {
        formBox.hidden = true;
    };

    $('#fmBrandSearch').oninput = render;

    $('#fmBrandRows').onclick = async event => {
        const btn = event.target.closest(
            'button[data-action]'
        );

        if (!btn) return;

        const m = marcas.find(x =>
            Number(x.id) === Number(btn.dataset.id)
        );

        if (!m) return;

        if (btn.dataset.action === 'edit') {
            return abrir(m);
        }

        const activo =
            Number(m.activo) === 1;

        if (!confirm(
            `¿${activo ? 'Desactivar' : 'Activar'} la marca ${m.nombre}?`
        )) {
            return;
        }

        btn.disabled = true;

        try {
            await call(
                `/brands/${m.id}/status`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        activo: !activo
                    })
                }
            );

            await refrescar();

        } catch (error) {
            avisar(error.message);

        } finally {
            btn.disabled = false;
        }
    };

    $('#fmBrandForm').onsubmit = async event => {
        event.preventDefault();

        const categoriasSeleccionadas = [
            ...document.querySelectorAll(
                'input[name="fmBrandCat"]:checked'
            )
        ].map(el => Number(el.value));

        if (!categoriasSeleccionadas.length) {
            return avisar(
                'Selecciona al menos una categoría.'
            );
        }

        const btn = $('#fmBrandSave');
        btn.disabled = true;

        try {
            const logo = await leerFoto(
                $('#fmBrandLogo').files[0]
            );

            const body = {
                nombre:
                    $('#fmBrandName').value.trim(),

                descripcion:
                    $('#fmBrandDesc').value.trim(),

                categorias:
                    categoriasSeleccionadas,

                ...(logo ? { logo } : {}),

                quitarLogo:
                    !logo &&
                    $('#fmRemoveLogo').checked
            };

            await call(
                editId
                    ? `/brands/${editId}`
                    : '/brands',
                {
                    method: editId
                        ? 'PUT'
                        : 'POST',

                    body: JSON.stringify(body)
                }
            );

            formBox.hidden = true;

            await refrescar();

            avisar(
                'Marca guardada correctamente.'
            );

        } catch (error) {
            avisar(error.message);

        } finally {
            btn.disabled = false;
        }
    };

    render();
}

/* ==========================================
   ADMINISTRACIÓN DE CATEGORÍAS
========================================== */

export async function manageCategories() {
    if (!await acceso()) return;

    estilos();

    let categorias = await call('/categories');

    if (!Array.isArray(categorias)) {
        throw new Error(
            'La API no devolvió las categorías.'
        );
    }

    let editId = null;

    layout('Categorías', 'categories', `
        <div class="fm-editor-catalogo">

           <div class="fm-products-heading">

    <div>

        <span class="fm-eyebrow">
            ADMINISTRACIÓN DEL CATÁLOGO
        </span>

        <h1>Categorías</h1>

        <p class="sub">
            Administra las categorías del catálogo,
            sus nombres y su disponibilidad.
        </p>

    </div>

    <button
        id="fmCatNew"
        type="button"
        class="btn"
    >
        Agregar categoría
    </button>

</div>

            <div
                id="fmEditorMsg"
                class="fm-editor-message"
                hidden
            ></div>

            <section
                class="panel"
                id="fmCatFormBox"
                hidden
            >
                <h2 id="fmCatFormTitle">
                    Agregar categoría
                </h2>

                <form id="fmCatForm">

                    <label class="fm-editor-field">
                        Nombre de la categoría *

                        <input
                            id="fmCatName"
                            required
                            minlength="2"
                            maxlength="100"
                        >
                    </label>

                    <div class="fm-editor-buttons">
                        <button
                            class="btn"
                            id="fmCatSave"
                            type="submit"
                        >
                            Guardar categoría
                        </button>

                        <button
                            class="btn light"
                            id="fmCatCancel"
                            type="button"
                        >
                            Cancelar
                        </button>
                    </div>

                </form>
            </section>

            <section class="panel">

                <div class="fm-editor-toolbar">
                    <h2>Categorías registradas</h2>

                    <input
                        id="fmCatSearch"
                        type="search"
                        placeholder="Buscar categoría"
                    >
                </div>

                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody id="fmCatRows"></tbody>
                    </table>
                </div>

            </section>

        </div>
    `);

    function render() {
        const q = $('#fmCatSearch')
            .value
            .trim()
            .toLocaleLowerCase('es');

        const visibles = categorias.filter(c =>
            String(c.nombre)
                .toLocaleLowerCase('es')
                .includes(q)
        );

        $('#fmCatRows').innerHTML =
            visibles.length
                ? visibles.map(c => {
                    const activo =
                        Number(c.activo) === 1;

                    return `
                        <tr>
                            <td>
                                ${Number(c.id)}
                            </td>

                            <td>
                                <strong>
                                    ${esc(c.nombre)}
                                </strong>
                            </td>

                            <td>
                                <span class="fm-editor-status ${
                                    activo ? 'on' : 'off'
                                }">
                                    ${activo ? 'Activa' : 'Inactiva'}
                                </span>
                            </td>

                            <td>
                                <div class="fm-editor-actions">
                                    <button
                                        class="btn light"
                                        data-action="edit"
                                        data-id="${Number(c.id)}"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        class="btn light"
                                        data-action="status"
                                        data-id="${Number(c.id)}"
                                    >
                                        ${activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')
                : `
                    <tr>
                        <td colspan="4">
                            No se encontraron categorías.
                        </td>
                    </tr>
                `;
    }

    function abrir(c = null) {
        editId = c ? Number(c.id) : null;

        $('#fmCatForm').reset();

        $('#fmCatName').value =
            c?.nombre || '';

        $('#fmCatFormTitle').textContent =
            c
                ? 'Editar categoría'
                : 'Nueva categoría';

        $('#fmCatSave').textContent =
            c
                ? 'Guardar cambios'
                : 'Registrar categoría';

        $('#fmCatFormBox').hidden = false;

        $('#fmCatFormBox').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    async function refrescar() {
        categorias = await call('/categories');
        render();
    }

    $('#fmCatNew').onclick = () => abrir();

    $('#fmCatCancel').onclick = () => {
        $('#fmCatFormBox').hidden = true;
    };

    $('#fmCatSearch').oninput = render;

    $('#fmCatRows').onclick = async event => {
        const btn = event.target.closest(
            'button[data-action]'
        );

        if (!btn) return;

        const c = categorias.find(x =>
            Number(x.id) === Number(btn.dataset.id)
        );

        if (!c) return;

        if (btn.dataset.action === 'edit') {
            return abrir(c);
        }

        const activo =
            Number(c.activo) === 1;

        if (!confirm(
            `¿${activo ? 'Desactivar' : 'Activar'} la categoría ${c.nombre}?`
        )) {
            return;
        }

        btn.disabled = true;

        try {
            await call(
                `/categories/${c.id}/status`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        activo: !activo
                    })
                }
            );

            await refrescar();

        } catch (error) {
            avisar(error.message);

        } finally {
            btn.disabled = false;
        }
    };

    $('#fmCatForm').onsubmit = async event => {
        event.preventDefault();

        const btn = $('#fmCatSave');
        btn.disabled = true;

        try {
            await call(
                editId
                    ? `/categories/${editId}`
                    : '/categories',
                {
                    method: editId
                        ? 'PUT'
                        : 'POST',

                    body: JSON.stringify({
                        nombre:
                            $('#fmCatName').value.trim()
                    })
                }
            );

            $('#fmCatFormBox').hidden = true;

            await refrescar();

            avisar(
                'Categoría guardada correctamente.'
            );

        } catch (error) {
            avisar(error.message);

        } finally {
            btn.disabled = false;
        }
    };

    render();
}
