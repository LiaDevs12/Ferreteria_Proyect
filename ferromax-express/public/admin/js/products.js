import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   PRODUCTOS
========================================== */

export async function products() {
    if (!await guard()) return;

    if (!['ADMINISTRADOR', 'EDITOR'].includes(me.rol)) {
        location.href = 'dashboard.html';
        return;
    }

    const [rows, options] = await Promise.all([
        call('/products'),
        call('/catalog-options')
    ]);

    const categories = options.categories || [];
    const brands = options.brands || [];

    const relations = Array.isArray(options.relations)
        ? options.relations
        : [];

    const maxPhotos = 5;
    const maxFileSize = 5 * 1024 * 1024;

    const acceptedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    const collator = new Intl.Collator('es-MX', {
        sensitivity: 'base',
        numeric: true
    });

    let savedPhotos = [];
    let chosenPhotos = [];
    let previewUrls = [];

    const initialCategory = new URLSearchParams(
        location.search
    ).get('categoria') || '';

    function categoryName(id) {
        return categories.find(c =>
            String(c.id) === String(id)
        )?.nombre || 'Sin categoría';
    }

    function brandName(id) {
        return brands.find(b =>
            String(b.id) === String(id)
        )?.nombre || 'Sin marca';
    }

    function statusBadge(product) {
        const active = Number(product.activo) === 1;

        return active ? `
            <span class="fm-status-pill fm-status-active">
                Activo
            </span>
        ` : `
            <span class="fm-status-pill fm-status-inactive">
                Deshabilitado
            </span>
        `;
    }

    layout('Productos', 'products', `

        <div class="fm-products-heading">

            <div>
                <span class="fm-eyebrow">
                    ADMINISTRACIÓN DEL CATÁLOGO
                </span>

                <h1>Productos</h1>

                <p class="sub">
                    Administra el catálogo por categorías,
                    precios, marcas, existencias y estado.
                </p>
            </div>

            <button
                id="addProductShortcut"
                class="btn"
                type="button"
            >
                Agregar producto
            </button>

        </div>

        <div id="msg" class="notice hidden" role="alert"></div>

        <section class="panel fm-catalog-panel">

            <div class="fm-section-heading">

                <div>
                    <h2 id="catalogTitle">
                        Todos los productos
                    </h2>

                    <p
                        id="catalogCount"
                        class="fm-results-label"
                    ></p>
                </div>

                <button
                    id="clearFilters"
                    class="btn light"
                    type="button"
                >
                    Limpiar filtros
                </button>

            </div>

            <div class="fm-product-filters">

                <div class="field fm-filter-wide">
                    <label for="filterText">
                        Buscar producto o SKU
                    </label>

                    <input
                        id="filterText"
                        type="search"
                        placeholder="Nombre del producto o código SKU"
                    >
                </div>

                <div class="field">
                    <label for="filterCategory">
                        Categoría
                    </label>

                    <select id="filterCategory">

                        <option value="">
                            Todas las categorías
                        </option>

                        ${categories.map(category => `
                            <option value="${esc(category.id)}">
                                ${esc(category.nombre)}
                            </option>
                        `).join('')}

                    </select>
                </div>

                <div class="field">
                    <label for="filterBrand">
                        Marca
                    </label>

                    <select id="filterBrand">
                        <option value="">
                            Todas las marcas
                        </option>
                    </select>
                </div>

                <div class="field">
                    <label for="filterStatus">
                        Estado del producto
                    </label>

                    <select id="filterStatus">
                        <option value="">
                            Todos los estados
                        </option>

                        <option value="activo">
                            Activos
                        </option>

                        <option value="inactivo">
                            Deshabilitados
                        </option>
                    </select>
                </div>

                <div class="field">
                    <label for="filterMinStock">
                        Stock mínimo
                    </label>

                    <input
                        id="filterMinStock"
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="0"
                    >
                </div>

                <div class="field">
                    <label for="filterMaxStock">
                        Stock máximo
                    </label>

                    <input
                        id="filterMaxStock"
                        type="number"
                        min="0"
                        step="0.001"
                        placeholder="Sin límite"
                    >
                </div>

                <div class="field">
                    <label for="filterMinPrice">
                        Precio mínimo (MXN)
                    </label>

                    <input
                        id="filterMinPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </div>

                <div class="field">
                    <label for="filterMaxPrice">
                        Precio máximo (MXN)
                    </label>

                    <input
                        id="filterMaxPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Sin límite"
                    >
                </div>

                <div class="field fm-filter-wide">
                    <label for="sortProducts">
                        Ordenar productos por
                    </label>

                    <select id="sortProducts">

                        <option value="nombre-asc">
                            Nombre: A a Z
                        </option>

                        <option value="nombre-desc">
                            Nombre: Z a A
                        </option>

                        <option value="precio-asc">
                            Precio: menor a mayor
                        </option>

                        <option value="precio-desc">
                            Precio: mayor a menor
                        </option>

                        <option value="stock-asc">
                            Stock: menor a mayor
                        </option>

                        <option value="stock-desc">
                            Stock: mayor a menor
                        </option>

                    </select>
                </div>

            </div>

            <div class="table-wrap">

                <table class="fm-products-table">

                    <thead>
                        <tr>
                            <th>Imagen</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Marca</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody id="filteredProductsBody"></tbody>

                </table>

            </div>

        </section>

        <section
            id="productDetail"
            class="panel fm-product-detail hidden"
            aria-live="polite"
        ></section>

        <section
            class="panel"
            id="productFormSection"
        >

            <div class="fm-section-heading">
                <h2 id="formTitle">
                    Agregar producto
                </h2>
            </div>

            <form id="productForm" class="form-grid">

                <input type="hidden" id="pid">

                <div class="field">
                    <label for="sku">SKU</label>

                    <input
                        id="sku"
                        maxlength="50"
                        required
                    >
                </div>

                <div class="field">
                    <label for="nombre">
                        Nombre del producto
                    </label>

                    <input
                        id="nombre"
                        maxlength="150"
                        required
                    >
                </div>

                <div class="field">
                    <label for="precio">
                        Precio de venta (MXN)
                    </label>

                    <input
                        id="precio"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    >
                </div>

                <div class="field">
                    <label for="stock">
                        Stock disponible
                    </label>

                    <input
                        id="stock"
                        type="number"
                        min="0"
                        max="99999999"
                        step="0.001"
                        value="0"
                        required
                    >

                    <small>
                        Al editar, este valor reemplaza
                        el stock actual.
                    </small>
                </div>

                <div class="field">
                    <label for="categoria">
                        Categoría
                    </label>

                    <select id="categoria" required>

                        <option value="">
                            Selecciona una categoría
                        </option>

                        ${categories.map(category => `
                            <option value="${esc(category.id)}">
                                ${esc(category.nombre)}
                            </option>
                        `).join('')}

                    </select>
                </div>

                <div class="field">
                    <label for="marca">Marca</label>

                    <select id="marca" disabled>
                        <option value="">
                            Selecciona una categoría primero
                        </option>
                    </select>
                </div>

                <div class="field">
                    <label for="unidad">
                        Unidad de venta
                    </label>

                    <select id="unidad">

                        ${[
                            'PIEZA',
                            'KG',
                            'METRO',
                            'LITRO',
                            'CAJA',
                            'BULTO',
                            'PAQUETE'
                        ].map(unit => `
                            <option value="${unit}">
                                ${unit}
                            </option>
                        `).join('')}

                    </select>
                </div>

                <div class="field full">
                    <label for="descripcion">
                        Descripción
                    </label>

                    <textarea id="descripcion"></textarea>
                </div>

                
<div class="field full fm-specifications-form">

    <label>
        Especificaciones técnicas
    </label>

    <p class="fm-specifications-help">
        Agrega las características técnicas del producto.
        Estas aparecerán en una tabla dentro de la tienda.
    </p>

    <div id="fmSpecRows"></div>

    <button
        type="button"
        id="fmAddSpec"
        class="btn light"
    >
        + Agregar especificación
    </button>

    <small>
        Puedes registrar hasta 30 características.
        Cada una debe tener su nombre y valor.
    </small>

</div>


                <div class="field full">
                    <label for="imagenes">
                        Fotografías del producto (máximo 5)
                    </label>

                    <input
                        id="imagenes"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                    >

                    <small>
                        JPG, PNG o WEBP.
                        Máximo 5 MB por fotografía.
                    </small>

                    <div
                        id="photoGallery"
                        class="fm-photo-gallery"
                        aria-live="polite"
                    ></div>
                </div>

                <div class="actions field full">

                    <button
                        type="submit"
                        class="btn"
                        id="saveProduct"
                    >
                        Guardar producto
                    </button>

                    <button
                        type="button"
                        class="btn light"
                        id="cancel"
                    >
                        Limpiar
                    </button>

                </div>

            </form>

        </section>

    `, categories);

    /* ======================================
       FILTROS DE MARCAS
    ====================================== */

    const filterCategory = $('#filterCategory');

    filterCategory.value = categories.some(c =>
        String(c.id) === initialCategory
    ) ? initialCategory : '';

    function filterBrands() {
        const categoryId = filterCategory.value;
        const previous = $('#filterBrand').value;

        const allowedIds = new Set(
            relations
                .filter(r =>
                    String(r.categoryId) === categoryId
                )
                .map(r => String(r.brandId))
        );

        const availableBrands = categoryId
            ? brands.filter(b =>
                allowedIds.has(String(b.id))
            )
            : brands;

        $('#filterBrand').innerHTML = `
            <option value="">
                Todas las marcas
            </option>

            ${availableBrands.map(brand => `
                <option value="${esc(brand.id)}">
                    ${esc(brand.nombre)}
                </option>
            `).join('')}
        `;

        $('#filterBrand').value = availableBrands.some(b =>
            String(b.id) === previous
        ) ? previous : '';
    }

    function updateSidebarSelection() {
        const current = filterCategory.value;

        $('#sidebarProductsMenu')
            ?.querySelectorAll('a')
            .forEach(link => {
                const url = new URL(link.href);

                const categoryId =
                    url.searchParams.get('categoria') || '';

                link.classList.toggle(
                    'selected',
                    categoryId === current
                );
            });
    }

    /* ======================================
       TABLA DE PRODUCTOS
    ====================================== */

    function renderProducts() {
        const categoryId = $('#filterCategory').value;
        const brandId = $('#filterBrand').value;

        const searchText = $('#filterText')
            .value
            .trim()
            .toLocaleLowerCase('es-MX');

        const state = $('#filterStatus').value;

        const getNumber = id =>
            $('#' + id).value.trim() === ''
                ? null
                : Number($('#' + id).value);

        const minStock = getNumber('filterMinStock');
        const maxStock = getNumber('filterMaxStock');
        const minPrice = getNumber('filterMinPrice');
        const maxPrice = getNumber('filterMaxPrice');

        const sort = $('#sortProducts').value;

        const filtered = rows.filter(product => {
            const nameAndSku = `
                ${product.nombre || ''}
                ${product.sku || ''}
            `.toLocaleLowerCase('es-MX');

            const stock = Number(product.stock || 0);
            const price = Number(product.precio || 0);
            const active = Number(product.activo) === 1;

            return (
                (
                    !categoryId ||
                    String(product.id_categoria) === categoryId
                ) &&
                (
                    !brandId ||
                    String(product.id_marca || '') === brandId
                ) &&
                (
                    !searchText ||
                    nameAndSku.includes(searchText)
                ) &&
                (
                    !state ||
                    (state === 'activo' ? active : !active)
                ) &&
                (
                    minStock === null ||
                    stock >= minStock
                ) &&
                (
                    maxStock === null ||
                    stock <= maxStock
                ) &&
                (
                    minPrice === null ||
                    price >= minPrice
                ) &&
                (
                    maxPrice === null ||
                    price <= maxPrice
                )
            );
        });

        filtered.sort((a, b) => {
            if (sort === 'nombre-desc') {
                return collator.compare(
                    b.nombre,
                    a.nombre
                );
            }

            if (sort === 'precio-asc') {
                return Number(a.precio) -
                    Number(b.precio);
            }

            if (sort === 'precio-desc') {
                return Number(b.precio) -
                    Number(a.precio);
            }

            if (sort === 'stock-asc') {
                return Number(a.stock || 0) -
                    Number(b.stock || 0);
            }

            if (sort === 'stock-desc') {
                return Number(b.stock || 0) -
                    Number(a.stock || 0);
            }

            return collator.compare(
                a.nombre,
                b.nombre
            );
        });

        $('#catalogTitle').textContent = categoryId
            ? categoryName(categoryId)
            : 'Todos los productos';

        $('#catalogCount').textContent =
            `${filtered.length} de ${rows.length} productos`;

        $('#filteredProductsBody').innerHTML =
            filtered.map(p => `

                <tr>

                    <td>
                        ${p.imagen ? `
                            <img
                                class="fm-product-thumb"
                                src="${esc(p.imagen)}"
                                alt="${esc(p.nombre)}"
                            >
                        ` : `
                            <span>Sin foto</span>
                        `}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="fm-product-name-button"
                            data-view="${esc(p.id)}"
                        >
                            ${esc(p.nombre)}
                        </button>

                        <small class="fm-sku-label">
                            ${esc(p.sku)}
                        </small>
                    </td>

                    <td>
                        ${esc(categoryName(p.id_categoria))}
                    </td>

                    <td>
                        ${esc(
                            p.marca ||
                            brandName(p.id_marca)
                        )}
                    </td>

                    <td>
                        ${money(p.precio)}
                    </td>

                    <td>
                        ${Number(
                            p.stock || 0
                        ).toLocaleString('es-MX')}
                    </td>

                    <td>
                        ${statusBadge(p)}
                    </td>

                    <td>
                        <div class="actions fm-product-actions">

                            <button
                                type="button"
                                class="btn light"
                                data-view="${esc(p.id)}"
                            >
                                Ver
                            </button>

                            <button
                                type="button"
                                class="btn light"
                                data-edit="${esc(p.id)}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn ${
                                    Number(p.activo) === 1
                                        ? 'danger'
                                        : 'light'
                                }"
                                data-status="${esc(p.id)}"
                            >
                                ${
                                    Number(p.activo) === 1
                                        ? 'Deshabilitar'
                                        : 'Habilitar'
                                }
                            </button>

                        </div>
                    </td>

                </tr>

            `).join('') || `

                <tr>
                    <td colspan="8" class="fm-no-results">
                        No hay productos que coincidan
                        con los filtros seleccionados.
                    </td>
                </tr>

            `;

        updateSidebarSelection();
    }

    /* ======================================
       EVENTOS DE FILTROS
    ====================================== */

    filterCategory.addEventListener('change', () => {
        const value = filterCategory.value;

        history.replaceState(
            null,
            '',
            value
                ? `productos.html?categoria=${
                    encodeURIComponent(value)
                }`
                : 'productos.html'
        );

        filterBrands();
        renderProducts();
    });

    [
        'filterText',
        'filterBrand',
        'filterStatus',
        'filterMinStock',
        'filterMaxStock',
        'filterMinPrice',
        'filterMaxPrice',
        'sortProducts'
    ].forEach(id => {
        const element = $('#' + id);

        const eventName =
            element.type === 'number' ||
            element.type === 'search'
                ? 'input'
                : 'change';

        element.addEventListener(
            eventName,
            renderProducts
        );
    });

    $('#clearFilters').onclick = () => {
        [
            'filterText',
            'filterMinStock',
            'filterMaxStock',
            'filterMinPrice',
            'filterMaxPrice'
        ].forEach(id => {
            $('#' + id).value = '';
        });

        filterCategory.value = '';
        $('#filterStatus').value = '';
        $('#sortProducts').value = 'nombre-asc';

        history.replaceState(
            null,
            '',
            'productos.html'
        );

        filterBrands();
        renderProducts();
    };

    filterBrands();
    renderProducts();

    /* ======================================
       FICHA DEL PRODUCTO
    ====================================== */

    async function showProduct(id) {
        const product = rows.find(p =>
            String(p.id) === String(id)
        );

        if (!product) return;

        let pictures = [];

        try {
            pictures = await call(
                `/products/${
                    encodeURIComponent(id)
                }/images`
            );
        } catch (error) {
            msg(
                'No se pudieron cargar las fotografías: ' +
                error.message
            );
        }

        const images = pictures.length
            ? pictures.map(picture => picture.url)
            : product.imagen
                ? [product.imagen]
                : [];

        const panel = $('#productDetail');

        panel.innerHTML = `

            <div class="fm-section-heading">

                <div>
                    <span class="fm-eyebrow">
                        FICHA DEL PRODUCTO
                    </span>

                    <h2>
                        ${esc(product.nombre)}
                    </h2>
                </div>

                <button
                    id="closeProductDetail"
                    class="btn light"
                    type="button"
                >
                    Cerrar
                </button>

            </div>

            <div class="fm-detail-layout">

                <div class="fm-detail-gallery">

                    ${images.length ? images.map(
                        (image, index) => `
                            <img
                                src="${esc(image)}"
                                alt="Fotografía ${
                                    index + 1
                                } de ${esc(product.nombre)}"
                                loading="lazy"
                            >
                        `
                    ).join('') : `

                        <div class="fm-detail-empty">
                            Este producto no tiene fotografías.
                        </div>

                    `}

                </div>

                <div class="fm-detail-info">

                    ${statusBadge(product)}

                    <p>
                        <strong>SKU:</strong>
                        ${esc(product.sku)}
                    </p>

                    <p>
                        <strong>Categoría:</strong>
                        ${esc(
                            categoryName(product.id_categoria)
                        )}
                    </p>

                    <p>
                        <strong>Marca:</strong>
                        ${esc(
                            product.marca ||
                            brandName(product.id_marca)
                        )}
                    </p>

                    <p>
                        <strong>Precio:</strong>
                        ${money(product.precio)}
                    </p>

                    <p>
                        <strong>Stock disponible:</strong>
                        ${Number(
                            product.stock || 0
                        ).toLocaleString('es-MX')}
                        ${esc(
                            product.unidad_venta || 'PIEZA'
                        )}
                    </p>

                    <p>
                        <strong>Descripción:</strong>
                        ${esc(
                            product.descripcion ||
                            'Sin descripción'
                        )}
                    </p>

                    <button
                        id="editFromDetail"
                        type="button"
                        class="btn"
                    >
                        Editar producto
                    </button>

                </div>

            </div>
        `;

        panel.classList.remove('hidden');

        panel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        $('#closeProductDetail').onclick = () => {
            panel.classList.add('hidden');
        };

        $('#editFromDetail').onclick = () => {
            editProduct(id);
        };
    }

    /* ======================================
       MARCAS POR CATEGORÍA
    ====================================== */

    function actualizarMarcas(selectedBrand = '') {
        const categoryId = String(
            $('#categoria').value || ''
        );

        const allowedIds = new Set(
            relations
                .filter(r =>
                    String(r.categoryId) === categoryId
                )
                .map(r => String(r.brandId))
        );

        const availableBrands = brands.filter(brand =>
            allowedIds.has(String(brand.id))
        );

        const firstText = !categoryId
            ? 'Selecciona una categoría primero'
            : availableBrands.length
                ? 'Sin marca'
                : 'No hay marcas relacionadas';

        $('#marca').innerHTML = `
            <option value="">
                ${firstText}
            </option>

            ${availableBrands.map(brand => `
                <option value="${esc(brand.id)}">
                    ${esc(brand.nombre)}
                </option>
            `).join('')}
        `;

        $('#marca').disabled =
            !categoryId ||
            availableBrands.length === 0;

        $('#marca').value = availableBrands.some(brand =>
            String(brand.id) === String(selectedBrand)
        ) ? String(selectedBrand) : '';
    }

    $('#categoria').addEventListener(
        'change',
        () => actualizarMarcas()
    );

    actualizarMarcas();

    /* ======================================
       FOTOGRAFÍAS
    ====================================== */

    function releasePreviews() {
        previewUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });

        previewUrls = [];
    }

    function showGallery() {
        releasePreviews();

        const savedHtml = savedPhotos.map(photo => `
            <div class="fm-photo-item">

                <img
                    src="${esc(photo.url)}"
                    alt="Fotografía guardada"
                >

                <span>
                    ${Number(photo.es_principal) === 1
                        ? 'Portada'
                        : 'Guardada'}
                </span>

                <button
                    type="button"
                    class="fm-photo-remove"
                    data-remove-photo="${esc(photo.id)}"
                >
                    Quitar
                </button>

            </div>
        `).join('');

        const newHtml = chosenPhotos.map((file, index) => {
            const url = URL.createObjectURL(file);

            previewUrls.push(url);

            return `
                <div class="fm-photo-item">

                    <img
                        src="${url}"
                        alt="Vista previa de ${esc(file.name)}"
                    >

                    <span>
                        Nueva ${index + 1}
                    </span>

                    <button
                        type="button"
                        class="fm-photo-remove"
                        data-remove-new="${index}"
                    >
                        Quitar
                    </button>

                </div>
            `;
        }).join('');

        $('#photoGallery').innerHTML =
            savedHtml + newHtml || `
                <p class="fm-photo-empty">
                    Aún no has seleccionado fotografías.
                </p>
            `;
    }

    showGallery();

    $('#imagenes').addEventListener('change', event => {
        const files = [...event.target.files];

        if (files.some(file =>
            !acceptedTypes.includes(file.type) ||
            file.size > maxFileSize
        )) {
            msg(
                'Solo se permiten imágenes JPG, PNG o WEBP ' +
                'de hasta 5 MB.'
            );

            $('#imagenes').value = '';
            return;
        }

        if (
            savedPhotos.length +
            chosenPhotos.length +
            files.length > maxPhotos
        ) {
            msg(
                `Solo puedes tener ${maxPhotos} fotografías ` +
                'por producto.'
            );

            $('#imagenes').value = '';
            return;
        }

        chosenPhotos.push(...files);

        $('#imagenes').value = '';

        showGallery();
    });

    $('#photoGallery').addEventListener(
        'click',
        async event => {
            const newButton = event.target.closest(
                '[data-remove-new]'
            );

            if (newButton) {
                const index = Number(
                    newButton.dataset.removeNew
                );

                chosenPhotos.splice(index, 1);
                showGallery();
                return;
            }

            const button = event.target.closest(
                '[data-remove-photo]'
            );

            if (!button) return;

            const productId = $('#pid').value;

            if (!productId) return;

            const confirmed = window.confirm(
                '¿Eliminar esta fotografía guardada del producto? ' +
                'El cambio se aplicará inmediatamente.'
            );

            if (!confirmed) return;

            button.disabled = true;

            try {
                await call(
                    `/products/${
                        encodeURIComponent(productId)
                    }/images/${
                        encodeURIComponent(
                            button.dataset.removePhoto
                        )
                    }`,
                    {
                        method: 'DELETE'
                    }
                );

                savedPhotos = await call(
                    `/products/${
                        encodeURIComponent(productId)
                    }/images`
                );

                showGallery();
                msg('Fotografía eliminada.');

            } catch (error) {
                msg(error.message);
                button.disabled = false;
            }
        }
    );

    /* ======================================
       LIMPIAR PRODUCTO
    ====================================== */

    
/* ==========================================
   ESPECIFICACIONES TÉCNICAS ADMIN
========================================== */

function agregarEspecificacion(
    caracteristica = '',
    valor = ''
) {
    const container = $('#fmSpecRows');

    if (
        container.querySelectorAll('.fm-spec-edit-row').length >= 30
    ) {
        msg('Máximo 30 especificaciones técnicas.');
        return;
    }

    const row = document.createElement('div');

    row.className = 'fm-spec-edit-row';

    row.innerHTML = `
        <input
            type="text"
            class="fm-spec-name"
            placeholder="Característica: Potencia"
            maxlength="80"
            value="${esc(caracteristica)}"
        >

        <input
            type="text"
            class="fm-spec-value"
            placeholder="Valor: 1,200 W"
            maxlength="250"
            value="${esc(valor)}"
        >

        <button
            type="button"
            class="fm-spec-remove"
            aria-label="Eliminar especificación"
            title="Eliminar"
        >
            ×
        </button>
    `;

    row.querySelector('.fm-spec-remove').onclick = () => {
        row.remove();
    };

    container.append(row);
}

function cargarEspecificaciones(data) {
    const container = $('#fmSpecRows');

    container.innerHTML = '';

    let specs = data;

    if (typeof specs === 'string') {
        try {
            specs = JSON.parse(specs);
        } catch {
            specs = [];
        }
    }

    if (!Array.isArray(specs)) {
        specs = [];
    }

    if (specs.length === 0) {
        agregarEspecificacion();
        return;
    }

    specs.forEach(item => {
        agregarEspecificacion(
            item.caracteristica || '',
            item.valor || ''
        );
    });
}

function obtenerEspecificaciones() {
    const rows = [
        ...document.querySelectorAll(
            '#fmSpecRows .fm-spec-edit-row'
        )
    ];

    const specs = [];

    for (const row of rows) {
        const caracteristica = row
            .querySelector('.fm-spec-name')
            .value.trim();

        const valor = row
            .querySelector('.fm-spec-value')
            .value.trim();

        if (!caracteristica && !valor) {
            continue;
        }

        if (!caracteristica || !valor) {
            throw new Error(
                'Cada especificación debe tener característica y valor.'
            );
        }

        specs.push({
            caracteristica,
            valor
        });
    }

    return specs;
}

$('#fmAddSpec').onclick = () => {
    agregarEspecificacion();
};

cargarEspecificaciones([]);


    function reset() {
        $('#productForm').reset();

        cargarEspecificaciones([]);

        $('#pid').value = '';
        $('#categoria').value = '';
        $('#stock').value = '0';
        $('#imagenes').value = '';

        $('#formTitle').textContent =
            'Agregar producto';

        $('#saveProduct').textContent =
            'Guardar producto';

        savedPhotos = [];
        chosenPhotos = [];

        actualizarMarcas();
        showGallery();
    }

    $('#cancel').onclick = reset;

    $('#addProductShortcut').onclick = () => {
        reset();

        $('#productFormSection').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        $('#sku').focus();
    };

    /* ======================================
       GUARDAR PRODUCTO
    ====================================== */

    $('#productForm').onsubmit = async event => {
        event.preventDefault();

        const button = $('#saveProduct');

        if (button.disabled) return;

        button.disabled = true;

        try {
            const id = $('#pid').value;

            const stock = Number(
                $('#stock').value
            );

            const price = Number(
                $('#precio').value
            );

            if (
                $('#stock').value.trim() === '' ||
                !Number.isFinite(stock) ||
                stock < 0 ||
                stock > 99999999
            ) {
                throw new Error(
                    'Ingresa una cantidad válida de stock.'
                );
            }

            if (
                $('#precio').value.trim() === '' ||
                !Number.isFinite(price) ||
                price < 0
            ) {
                throw new Error(
                    'Ingresa un precio válido.'
                );
            }

            if (
                savedPhotos.length +
                chosenPhotos.length > maxPhotos
            ) {
                throw new Error(
                    `El máximo es de ${maxPhotos} fotografías.`
                );
            }

            const images = await Promise.all(
                chosenPhotos.map(imgData)
            );


const data = {
    sku: $('#sku').value.trim(),

    nombre: $('#nombre').value.trim(),

    precio: price,

    stock: stock,

    id_categoria: $('#categoria').value,

    id_marca: $('#marca').value || null,

    unidad_venta: $('#unidad').value,

    descripcion:
        $('#descripcion').value.trim(),

    especificaciones_tecnicas:
        obtenerEspecificaciones(),

    imagenes: images
};


            if (!data.sku || !data.nombre) {
                throw new Error(
                    'Completa el SKU y el nombre.'
                );
            }

            if (!data.id_categoria) {
                throw new Error(
                    'Selecciona una categoría.'
                );
            }

            if (
                data.id_marca &&
                !relations.some(relation =>
                    String(relation.categoryId) ===
                    String(data.id_categoria) &&
                    String(relation.brandId) ===
                    String(data.id_marca)
                )
            ) {
                throw new Error(
                    'La marca no corresponde a la categoría seleccionada.'
                );
            }

            if (id) {
                const original = rows.find(product =>
                    String(product.id) === String(id)
                );

                if (!original) {
                    throw new Error(
                        'Producto no encontrado.'
                    );
                }

                data.activo =
                    Number(original.activo) === 1;

                await call(
                    '/products/' + encodeURIComponent(id),
                    {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    }
                );

            } else {
                await call('/products', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            }

            location.reload();

        } catch (error) {
            msg(error.message);
            button.disabled = false;
        }
    };

    /* ======================================
       EDITAR PRODUCTO
    ====================================== */

    async function editProduct(id) {
        const product = rows.find(p =>
            String(p.id) === String(id)
        );

        if (!product) {
            msg('Producto no encontrado.');
            return;
        }

        try {
            const pictures = await call(
                `/products/${
                    encodeURIComponent(product.id)
                }/images`
            );

            $('#pid').value = product.id;
            $('#sku').value = product.sku;
            $('#nombre').value = product.nombre;
            $('#precio').value = product.precio;

            $('#stock').value =
                product.stock ?? 0;

            $('#categoria').value =
                String(product.id_categoria);

            actualizarMarcas(
                product.id_marca || ''
            );

            $('#unidad').value =
                product.unidad_venta || 'PIEZA';


$('#descripcion').value =
    product.descripcion || '';

cargarEspecificaciones(
    product.especificaciones_tecnicas ??
    product.specifications ??
    []
);

$('#imagenes').value = '';


            savedPhotos = pictures;
            chosenPhotos = [];

            showGallery();

            $('#formTitle').textContent =
                'Editar producto';

            $('#saveProduct').textContent =
                'Actualizar producto';

            $('#productFormSection').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

        } catch (error) {
            msg(error.message);
        }
    }

    /* ======================================
       ACCIONES DE LA TABLA
    ====================================== */

    $('#filteredProductsBody').addEventListener(
        'click',
        async event => {
            const button = event.target.closest(
                'button[data-view], ' +
                'button[data-edit], ' +
                'button[data-status]'
            );

            if (!button) return;

            if (button.dataset.view) {
                await showProduct(
                    button.dataset.view
                );
                return;
            }

            if (button.dataset.edit) {
                await editProduct(
                    button.dataset.edit
                );
                return;
            }

            if (button.dataset.status) {
                const id = button.dataset.status;

                const product = rows.find(p =>
                    String(p.id) === String(id)
                );

                if (!product) return;

                const active =
                    Number(product.activo) === 1;

                const action = active
                    ? 'deshabilitar'
                    : 'habilitar';

                if (!window.confirm(
                    `¿Deseas ${action} "${product.nombre}"?`
                )) {
                    return;
                }

                button.disabled = true;

                try {
                    await call(
                        `/products/${
                            encodeURIComponent(id)
                        }/status`,
                        {
                            method: 'PATCH',
                            body: JSON.stringify({
                                activo: !active
                            })
                        }
                    );

                    location.reload();

                } catch (error) {
                    msg(error.message);
                    button.disabled = false;
                }
            }
        }
    );

    if (!Array.isArray(options.relations)) {
        msg(
            'El backend todavía no envía las relaciones ' +
            'entre categorías y marcas.'
        );
    }
}
