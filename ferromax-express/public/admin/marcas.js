
/* ==========================================
   FERROMAX - ADMINISTRACIÓN DE MARCAS
========================================== */

async function brandsPage() {
    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const [marcas, opciones] = await Promise.all([
        call('/brands'),
        call('/catalog-options')
    ]);

    const categorias = opciones.categories || [];

    /* ======================================
       INTERFAZ
    ====================================== */

    layout('Marcas', 'brands', `

        <div class="fm-brands-heading">

            <span class="fm-eyebrow">
                CATÁLOGO FERROMAX
            </span>

            <h1>
                Administrar marcas
            </h1>

            <p>
                Agrega marcas y logotipos para el
                inicio y la página de marcas.
            </p>

        </div>

        <div
            id="msg"
            class="notice hidden"
            role="alert"
        ></div>

        <!-- FORMULARIO -->

        <section class="panel fm-brands-panel">

            <h2 id="brandFormTitle">
                Agregar marca
            </h2>

            <form
                id="brandForm"
                class="fm-brands-form"
            >

                <input
                    type="hidden"
                    id="brandId"
                >

                <div class="field">

                    <label for="brandName">
                        Nombre de la marca
                    </label>

                    <input
                        id="brandName"
                        maxlength="100"
                        required
                        placeholder="Ejemplo: Bosch"
                    >

                </div>

                <div class="field">

                    <label for="brandDescription">
                        Descripción (opcional)
                    </label>

                    <textarea
                        id="brandDescription"
                        maxlength="255"
                        rows="3"
                    ></textarea>

                </div>

                <!-- CATEGORÍAS -->

                <div class="field fm-brands-full">

                    <label>
                        Categorías en las que se utiliza
                    </label>

                    <div
                        class="fm-brands-categories"
                        id="brandCategories"
                    >

                        ${categorias.map(c => `

                            <label class="fm-brand-check">

                                <input
                                    type="checkbox"
                                    name="brandCategory"
                                    value="${esc(c.id)}"
                                >

                                <span>
                                    ${esc(c.nombre)}
                                </span>

                            </label>

                        `).join('')}

                    </div>

                    <small>
                        Selecciona al menos una categoría
                        para poder elegir la marca al
                        registrar productos.
                    </small>

                </div>

                <!-- LOGOTIPO -->

                <div class="field">

                    <label for="brandLogo">
                        Logotipo de la marca
                    </label>

                    <input
                        id="brandLogo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                    >

                    <small>
                        JPG, PNG o WEBP.
                        Máximo 5 MB.
                    </small>

                    <label class="fm-brand-check">

                        <input
                            id="removeBrandLogo"
                            type="checkbox"
                        >

                        Quitar logotipo actual

                    </label>

                </div>

                <!-- VISTA PREVIA -->

                <div
                    class="fm-brand-preview"
                    id="brandLogoPreview"
                >
                    Sin logotipo
                </div>

                <!-- BOTONES -->

                <div
                    class="fm-brands-actions fm-brands-full"
                >

                    <button
                        class="btn"
                        id="saveBrand"
                        type="submit"
                    >
                        Guardar marca
                    </button>

                    <button
                        class="btn light"
                        id="clearBrand"
                        type="button"
                    >
                        Limpiar
                    </button>

                </div>

            </form>

        </section>

        <!-- MARCAS REGISTRADAS -->

        <section class="panel fm-brands-panel">

            <h2>
                Marcas registradas (${marcas.length})
            </h2>

            <div
                class="fm-brands-list"
                id="brandsList"
            >

                ${marcas.map(m => `

                    <article class="fm-brand-item">

                        <div class="fm-brand-item-logo">

                            ${m.logo_url ? `

                                <img
                                    src="${esc(m.logo_url)}"
                                    alt="Logotipo de ${esc(m.nombre)}"
                                >

                            ` : `

                                <b>
                                    ${esc(m.nombre)}
                                </b>

                            `}

                        </div>

                        <div class="fm-brand-item-info">

                            <strong>
                                ${esc(m.nombre)}
                            </strong>

                            <span>
                                ${
                                    Number(m.activo)
                                        ? 'Activa'
                                        : 'Inactiva'
                                }
                            </span>

                        </div>

                        <div class="fm-brand-item-buttons">

                            <button
                                type="button"
                                class="btn light"
                                data-brand-edit="${esc(m.id)}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn ${
                                    Number(m.activo)
                                        ? 'danger'
                                        : 'light'
                                }"
                                data-brand-status="${esc(m.id)}"
                            >
                                ${
                                    Number(m.activo)
                                        ? 'Desactivar'
                                        : 'Activar'
                                }
                            </button>

                        </div>

                    </article>

                `).join('') || `

                    <p>
                        No hay marcas registradas.
                    </p>

                `}

            </div>

        </section>

    `);

    /* ======================================
       VARIABLES
    ====================================== */

    let previousLogo = '';
    let previewObjectURL = '';

    const preview = $('#brandLogoPreview');
    const fileInput = $('#brandLogo');
    const removeBox = $('#removeBrandLogo');

    /* ======================================
       MOSTRAR LOGOTIPO
    ====================================== */

    function mostrarLogo(src) {
        if (src) {
            preview.innerHTML = '';

            const img = document.createElement(
                'img'
            );

            img.src = src;
            img.alt = 'Vista previa del logotipo';

            preview.append(img);

        } else {
            preview.textContent =
                'Sin logotipo';
        }
    }

    /* ======================================
       LIMPIAR URL TEMPORAL
    ====================================== */

    function limpiarObjectURL() {
        if (previewObjectURL) {
            URL.revokeObjectURL(
                previewObjectURL
            );

            previewObjectURL = '';
        }
    }

    /* ======================================
       LIMPIAR FORMULARIO
    ====================================== */

    function limpiar() {
        $('#brandForm').reset();

        $('#brandId').value = '';

        $('#brandFormTitle').textContent =
            'Agregar marca';

        $('#saveBrand').textContent =
            'Guardar marca';

        previousLogo = '';

        limpiarObjectURL();

        mostrarLogo('');
    }

    /* ======================================
       PREVISUALIZAR IMAGEN
    ====================================== */

    fileInput.addEventListener(
        'change',
        () => {
            limpiarObjectURL();

            const file = fileInput.files?.[0];

            if (file) {
                previewObjectURL =
                    URL.createObjectURL(file);

                mostrarLogo(
                    previewObjectURL
                );

                removeBox.checked = false;

            } else {
                mostrarLogo(
                    removeBox.checked
                        ? ''
                        : previousLogo
                );
            }
        }
    );

    removeBox.addEventListener(
        'change',
        () => {
            if (removeBox.checked) {
                fileInput.value = '';

                limpiarObjectURL();
            }

            mostrarLogo(
                removeBox.checked
                    ? ''
                    : previousLogo
            );
        }
    );

    $('#clearBrand').onclick = limpiar;

    /* ======================================
       EDITAR MARCA
    ====================================== */

    document.querySelectorAll(
        '[data-brand-edit]'
    ).forEach(button => {
        button.onclick = () => {

            const brand = marcas.find(m =>
                String(m.id) ===
                button.dataset.brandEdit
            );

            if (!brand) return;

            limpiar();

            $('#brandId').value = brand.id;

            $('#brandName').value =
                brand.nombre || '';

            $('#brandDescription').value =
                brand.descripcion || '';

            const seleccionadas = new Set(
                (brand.categorias || []).map(String)
            );

            document.querySelectorAll(
                '[name="brandCategory"]'
            ).forEach(c => {
                c.checked = seleccionadas.has(
                    c.value
                );
            });

            previousLogo =
                brand.logo_url || '';

            mostrarLogo(
                previousLogo
            );

            $('#brandFormTitle').textContent =
                'Editar marca';

            $('#saveBrand').textContent =
                'Actualizar marca';

            $('#brandForm').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        };
    });

    /* ======================================
       ACTIVAR O DESACTIVAR MARCA
    ====================================== */

    document.querySelectorAll(
        '[data-brand-status]'
    ).forEach(button => {

        button.onclick = async () => {

            const brand = marcas.find(m =>
                String(m.id) ===
                button.dataset.brandStatus
            );

            if (!brand) return;

            button.disabled = true;

            try {
                await call(
                    '/brands/' +
                    encodeURIComponent(brand.id) +
                    '/status',
                    {
                        method: 'PATCH',

                        body: JSON.stringify({
                            activo:
                                !Number(brand.activo)
                        })
                    }
                );

                location.reload();

            } catch (e) {
                msg(e.message);

                button.disabled = false;
            }
        };
    });

    /* ======================================
       GUARDAR MARCA
    ====================================== */

    $('#brandForm').onsubmit = async event => {
        event.preventDefault();

        const button = $('#saveBrand');

        button.disabled = true;

        try {
            const categoriasElegidas = [
                ...document.querySelectorAll(
                    '[name="brandCategory"]:checked'
                )
            ].map(c => Number(c.value));

            if (!categoriasElegidas.length) {
                throw new Error(
                    'Selecciona al menos una categoría.'
                );
            }

            const file = fileInput.files?.[0];

            const logo = file
                ? await imgData(file)
                : undefined;

            const id = $('#brandId').value;

            const data = {
                nombre:
                    $('#brandName').value.trim(),

                descripcion:
                    $('#brandDescription').value.trim(),

                categorias:
                    categoriasElegidas,

                ...(logo ? { logo } : {}),

                quitarLogo:
                    removeBox.checked
            };

            await call(
                id
                    ? '/brands/' +
                      encodeURIComponent(id)
                    : '/brands',

                {
                    method: id
                        ? 'PUT'
                        : 'POST',

                    body: JSON.stringify(data)
                }
            );

            location.reload();

        } catch (e) {
            msg(e.message);

            button.disabled = false;
        }
    };
}
