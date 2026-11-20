import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

import { addBrandsStyles } from './styles.js';

/* ==========================================
   FERROMAX
   ADMINISTRACIÓN DE MARCAS
========================================== */

export async function brandsPage() {
    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const [brands, options] = await Promise.all([
    call('/brands'),
    call('/catalog-options')
]);

const categories = Array.isArray(options.categories)
    ? options.categories
    : [];

    addBrandsStyles();

    layout('Marcas', 'brands', `
        <div class="fm-brands-heading">
            <span class="fm-eyebrow">CATÁLOGO FERROMAX</span>
            <h1>Administración de marcas</h1>
            <p>Agrega marcas y administra sus logotipos. Los cambios se reflejarán en la tienda web.</p>
        </div>

        <div id="msg" class="notice hidden" role="alert"></div>

        <section class="panel fm-brands-panel">
            <h2 id="fmBrandFormTitle">Agregar nueva marca</h2>

            <form id="fmBrandForm" class="fm-brands-form">
                <input type="hidden" id="fmBrandId">

                <div class="fm-brand-left">
                    <div class="fm-brand-stack">
                        <div class="field">
                            <label for="fmBrandName">Nombre de la marca</label>
                            <input
                                type="text"
                                id="fmBrandName"
                                maxlength="100"
                                placeholder="Ejemplo: Bosch"
                                required
                            >
                        </div>

                        <div class="fm-brand-categories">

    <span class="fm-brand-categories-title">
        Categorías de la marca *
    </span>

    <small>
        Selecciona una o varias categorías
        en las que aparecerá esta marca.
    </small>

    <div
        id="fmBrandCategories"
        class="fm-brand-categories-list"
        role="group"
        aria-label="Categorías de la marca"
    >

        ${categories.length ? categories.map(category => `

            <label class="fm-brand-category-option">

                <input
                    type="checkbox"
                    name="fmBrandCategories"
                    value="${esc(category.id)}"
                >

                <span>
                    ${esc(category.nombre)}
                </span>

            </label>

        `).join('') : `

            <p>
                No hay categorías activas disponibles.
            </p>

        `}

    </div>

    <span
        id="fmBrandCategoryCount"
        class="fm-brand-category-count"
        aria-live="polite"
    >
        0 categorías seleccionadas
    </span>

</div>

                        <div class="field">
                            <label for="fmBrandLogo">Logotipo de la marca</label>
                            <input
                                type="file"
                                id="fmBrandLogo"
                                accept="image/png,image/jpeg,image/webp"
                            >
                            <small>
                                Formatos permitidos: PNG, JPG o WEBP. Tamaño máximo: 5 MB.
                            </small>
                        </div>

                        <div class="fm-brands-actions">
                            <button id="fmBrandSave" type="submit" class="btn">
                                Guardar marca
                            </button>

                            <button id="fmBrandClear" type="button" class="btn light">
                                Limpiar formulario
                            </button>
                        </div>
                    </div>
                </div>

                <div class="fm-brand-right">
                    <div class="fm-brand-preview-wrap">
                        <div class="fm-brand-preview-title">Vista previa del logotipo</div>
                        <div id="fmBrandPreview" class="fm-brand-preview">
                            Sin logotipo
                        </div>
                    </div>
                </div>
            </form>
        </section>

        <section class="panel fm-brands-panel">
            <h2>Marcas registradas (${brands.length})</h2>

            <div id="fmBrandsList" class="fm-brands-list">
                ${brands.map(brand => `
                    <article class="fm-brand-item">
                        <div class="fm-brand-item-logo">
                            ${brand.logo_url ? `
                                <img
                                    src="${esc(brand.logo_url)}"
                                    alt="Logotipo de ${esc(brand.nombre)}"
                                >
                            ` : `
                                <span>${esc(brand.nombre)}</span>
                            `}
                        </div>

                        <div class="fm-brand-item-info">

    <strong>${esc(brand.nombre)}</strong>

    <small>
        ${Number(brand.activo) ? 'Activa' : 'Inactiva'}
    </small>

    <div class="fm-brand-category-tags">

        ${(brand.categorias || []).map(id => {

            const category = categories.find(
                c => String(c.id) === String(id)
            );

            return category ? `
                <span class="fm-brand-category-tag">
                    ${esc(category.nombre)}
                </span>
            ` : '';

        }).join('') || `
            <small>Sin categorías asignadas</small>
        `}

    </div>

</div>

                        <div class="fm-brand-item-actions">
                            <button
                                type="button"
                                class="btn light"
                                data-brand-edit="${esc(brand.id)}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn ${Number(brand.activo) ? 'danger' : 'light'}"
                                data-brand-status="${esc(brand.id)}"
                            >
                                ${Number(brand.activo) ? 'Desactivar' : 'Activar'}
                            </button>
                        </div>
                    </article>
                `).join('') || `
                    <p>No hay marcas registradas.</p>
                `}
            </div>
        </section>
    `);

    const form = $('#fmBrandForm');
    const fileInput = $('#fmBrandLogo');
    const preview = $('#fmBrandPreview');
    const saveButton = $('#fmBrandSave');

    const categoryInputs = [
    ...document.querySelectorAll(
        'input[name="fmBrandCategories"]'
    )
];

function selectedCategories() {
    return categoryInputs
        .filter(input => input.checked)
        .map(input => Number(input.value));
}

function updateCategoryCount() {
    const total = selectedCategories().length;

    $('#fmBrandCategoryCount').textContent =
        `${total} ${total === 1
            ? 'categoría seleccionada'
            : 'categorías seleccionadas'}`;
}

categoryInputs.forEach(input => {
    input.addEventListener(
        'change',
        updateCategoryCount
    );
});

updateCategoryCount();

    let previousLogo = '';
    let temporaryUrl = '';

    function cleanTemporaryUrl() {
        if (temporaryUrl) {
            URL.revokeObjectURL(temporaryUrl);
            temporaryUrl = '';
        }
    }

    function showLogo(url = '') {
        preview.replaceChildren();

        if (!url) {
            preview.textContent = 'Sin logotipo';
            return;
        }

        const image = document.createElement('img');
        image.src = url;
        image.alt = 'Vista previa del logotipo';

        image.onerror = () => {
            image.remove();
            preview.textContent = 'No se pudo cargar el logotipo.';
        };

        preview.appendChild(image);
    }

    function resetBrandForm() {
        form.reset();
        categoryInputs.forEach(input => {
    input.checked = false;
});

updateCategoryCount();
        $('#fmBrandId').value = '';
        $('#fmBrandFormTitle').textContent = 'Agregar nueva marca';
        saveButton.textContent = 'Guardar marca';
        previousLogo = '';
        cleanTemporaryUrl();
        showLogo();
    }

    fileInput.addEventListener('change', () => {
        cleanTemporaryUrl();

        const file = fileInput.files?.[0];

        if (file) {
            temporaryUrl = URL.createObjectURL(file);
            showLogo(temporaryUrl);
        } else {
            showLogo(previousLogo);
        }
    });

    $('#fmBrandClear').onclick = resetBrandForm;

    $('#fmBrandsList').addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;

        if ('brandEdit' in button.dataset) {
            const brand = brands.find(b => String(b.id) === button.dataset.brandEdit);
            if (!brand) return;

            resetBrandForm();

            $('#fmBrandId').value = brand.id;
            $('#fmBrandName').value = brand.nombre || '';

            const selectedIds = new Set(
    (brand.categorias || []).map(String)
);

categoryInputs.forEach(input => {
    input.checked = selectedIds.has(input.value);
});

updateCategoryCount();

            previousLogo = brand.logo_url || '';
            showLogo(previousLogo);

            $('#fmBrandFormTitle').textContent = 'Editar marca';
            saveButton.textContent = 'Actualizar marca';

            form.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            return;
        }

        if ('brandStatus' in button.dataset) {
            const brand = brands.find(b => String(b.id) === button.dataset.brandStatus);
            if (!brand) return;

            const activate = !Number(brand.activo);
            const action = activate ? 'activar' : 'desactivar';

            if (!confirm(`¿Deseas ${action} la marca "${brand.nombre}"?`)) {
                return;
            }

            button.disabled = true;

            try {
                await call(
                    '/brands/' + encodeURIComponent(brand.id) + '/status',
                    {
                        method: 'PATCH',
                        body: JSON.stringify({
                            activo: activate
                        })
                    }
                );

                location.reload();

            } catch (error) {
                msg(error.message);
                button.disabled = false;
            }
        }
    });

    form.onsubmit = async event => {
        event.preventDefault();

        if (saveButton.disabled) return;

        saveButton.disabled = true;

        try {
            const name = $('#fmBrandName').value.trim();

            if (name.length < 2 || name.length > 100) {
                throw new Error('Escribe un nombre válido para la marca.');
            }

            const file = fileInput.files?.[0];
            const logo = file ? await imgData(file) : '';

            const id = $('#fmBrandId').value;

            const categorias = selectedCategories();

if (!categorias.length) {
    throw new Error(
        'Selecciona al menos una categoría para la marca.'
    );
}

const data = {
    nombre: name,
    categorias,
    ...(logo ? { logo } : {})
};

            await call(
                id
                    ? '/brands/' + encodeURIComponent(id)
                    : '/brands',
                {
                    method: id ? 'PUT' : 'POST',
                    body: JSON.stringify(data)
                }
            );

            location.reload();

        } catch (error) {
            msg(error.message);
            saveButton.disabled = false;
        }
    };
}
