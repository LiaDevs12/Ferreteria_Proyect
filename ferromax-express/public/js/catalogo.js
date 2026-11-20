import { ic, emo } from '/ui.js';
import { esc, norm, validImage, imageUrl } from './core.js';


/* ==========================================
   FERROMAX - ENCABEZADOS DE SECCIONES
========================================== */

const INFORMACION_SECCIONES = {

    'Categorías principales': {
        etiqueta: 'EXPLORA FERROMAX',
        descripcion:
            'Encuentra herramientas, materiales y accesorios ' +
            'organizados para cada tipo de proyecto.'
    },

    'Productos recientes': {
        etiqueta: 'DESCUBRE NUESTRO CATÁLOGO',
        descripcion:
            'Conoce los productos disponibles recientemente ' +
            'en nuestra tienda y encuentra lo que necesitas.'
    },

    'Marcas que manejamos': {
        etiqueta: 'MARCAS FERROMAX',
        descripcion:
            'Explora las marcas de herramientas y materiales ' +
            'que forman parte de nuestro catálogo.'
    }

};


/* ==========================================
   GENERADOR DE TÍTULOS
========================================== */


/* ==========================================
   FERROMAX - TÍTULOS DE SECCIONES
========================================== */

const TITULOS_INICIO = {

    'Categorías principales': {
        etiqueta: 'EXPLORA FERROMAX',
        descripcion:
            'Encuentra herramientas, materiales y accesorios ' +
            'para cada uno de tus proyectos.'
    },

    'Productos recientes': {
        etiqueta: 'DESCUBRE NUESTROS PRODUCTOS',
        descripcion:
            'Conoce nuestra selección de productos para ' +
            'la construcción, el taller y el hogar.'
    },

    'Marcas que manejamos': {
        etiqueta: 'CALIDAD Y CONFIANZA',
        descripcion:
            'Trabajamos con diferentes marcas para ofrecerte ' +
            'herramientas y materiales para tus necesidades.'
    }

};


/* ==========================================
   COMPONENTE DE ENCABEZADO
========================================== */

export const head = (
    title,
    url = '#/catalogo',
    label = 'Ver todas'
) => {

    const datos = TITULOS_INICIO[title] || {
        etiqueta: 'FERROMAX',
        descripcion: ''
    };

    return `

        <div class="fm-section-head fm-editorial-section">

            <div class="fm-editorial-section-info">

                <span class="fm-editorial-section-label">
                    ${esc(datos.etiqueta)}
                </span>

                <h2 class="fm-editorial-section-title">
                    ${esc(title)}
                </h2>

                ${datos.descripcion ? `

                    <p class="fm-editorial-section-description">
                        ${esc(datos.descripcion)}
                    </p>

                ` : ''}

            </div>

            <a
                href="${esc(url)}"
                class="fm-editorial-section-link"
            >
                ${esc(label)}

                ${ic('arrowR', 'h-4 w-4')}
            </a>

        </div>

    `;
};



export const carousel = (
    items,
    width = '280px'
) => `
    <div class="fm-carousel" data-carousel>

        <button
            type="button"
            data-scroll="-1"
            aria-label="Anterior"
        >
            ${ic('arrowL', 'h-6 w-6')}
        </button>

        <div class="fm-track" data-track>

            ${items.map(item => `
                <div
                    style="flex:0 0 ${width};min-width:0"
                >
                    ${item}
                </div>
            `).join('')}

        </div>

        <button
            type="button"
            data-scroll="1"
            aria-label="Siguiente"
        >
            ${ic('arrowR', 'h-6 w-6')}
        </button>

    </div>
`;

export const empty = (
    title,
    url = '#/catalogo',
    label = 'Volver al catálogo'
) => `
    <div class="fm-empty">

        <h1>
            ${esc(title)}
        </h1>

        <a class="btn" href="${url}">
            ${label}
        </a>

    </div>
`;



/* ==========================================
   IMÁGENES PERSONALIZADAS POR CATEGORÍA
========================================== */

const IMAGENES_CATEGORIAS = {

    'abrasivos y carpinteria':
        '/categorias/abrasivos.jpg',

    'adhesivos y selladores':
        '/categorias/adhesivos.jpg',

    'banos y accesorios':
        '/categorias/banos.jpg',

    'cerraduras y herrajes':
        '/categorias/cerraduras.jpg',

    'construccion y albanileria':
        '/categorias/construccion.jpg',

    'herramientas electricas':
        '/categorias/herramientas-electricas.jpg'

};


/* ==========================================
   TARJETAS DE CATEGORÍAS CON IMAGEN DE PORTADA
========================================== */

export const catTile = (
    category,
    products = [],
    categories = []
) => {

    const nombre = String(
        category.name ||
        category.nombre ||
        'Categoría'
    );

    const id = String(category.id);

    const clave = norm(nombre);

    /* IMAGEN CONFIGURADA MANUALMENTE */

    const imagenPersonalizada =
        IMAGENES_CATEGORIAS[clave] || '';

    /*
       RESPALDO:
       Si una categoría no tiene imagen personalizada,
       se buscará la imagen de uno de sus productos.
    */

    const idsPermitidos = subcategoryIds(
        categories.length ? categories : [category],
        id
    );

    let imagenProducto = '';

    for (const producto of products) {

        const categoriaProducto = String(
            producto.categoryId ??
            producto.id_categoria ??
            ''
        );

        if (!idsPermitidos.has(categoriaProducto)) {
            continue;
        }

        const posiblesImagenes = [
            producto.image,
            producto.imagen,
            ...(Array.isArray(producto.images)
                ? producto.images
                : []),
            ...(Array.isArray(producto.imagenes)
                ? producto.imagenes
                : [])
        ];

        for (const imagen of posiblesImagenes) {

            const ruta = typeof imagen === 'string'
                ? imagen.trim()
                : String(
                    imagen?.url ||
                    imagen?.url_imagen ||
                    imagen?.src ||
                    ''
                ).trim();

            if (validImage(ruta)) {
                imagenProducto = ruta;
                break;
            }
        }

        if (imagenProducto) break;
    }

    const imagenFinal =
        imagenPersonalizada || imagenProducto;

    /*
       Si una imagen personalizada no existe,
       intentar mostrar la fotografía de un producto.
    */

    const imagenRespaldo =
        imagenPersonalizada && imagenProducto
            ? imagenProducto
            : '';

    return `
        <a
            class="fm-category-cover"
            href="#/catalogo?categoryId=${encodeURIComponent(id)}"
            aria-label="Ver productos de ${esc(nombre)}"
        >

            ${imagenFinal ? `

                <img
                    class="fm-category-cover-image"
                    src="${esc(imagenFinal)}"
                    alt=""
                    loading="lazy"
                    onerror="
                        this.onerror = null;
                        ${
                            imagenRespaldo
                                ? `this.src = '${esc(imagenRespaldo)}';`
                                : 'this.remove();'
                        }
                    "
                >

            ` : ''}

            <div class="fm-category-overlay">

                <div class="fm-category-overlay-content">

                    <span class="fm-category-kicker">
                        EXPLORA FERROMAX
                    </span>

                    <h3>
                        ${esc(nombre)}
                    </h3>

                    <span class="fm-category-discover">
                        Ver productos
                        <span aria-hidden="true">→</span>
                    </span>

                </div>

            </div>

        </a>
    `;
};

/* ==========================================
   CATEGORÍAS Y SUBCATEGORÍAS
========================================== */

export function categoryFromURL(qs, categories) {
    const value =
        qs.get('categoryId') ||
        qs.get('id_categoria') ||
        qs.get('categoria') ||
        qs.get('cat');

    if (!value) {
        return {
            requested: false,
            id: '',
            name: '',
            exists: true
        };
    }

    const item = categories.find(
        c =>
            String(c.id) === String(value) ||
            norm(c.name) === norm(value)
    );

    return {
        requested: true,
        id: item ? String(item.id) : '',
        name: item?.name || value,
        exists: !!item
    };
}

export function subcategoryIds(categories, id) {
    const ids = new Set([String(id)]);

    let changed = true;

    while (changed) {
        changed = false;

        for (const c of categories) {
            const parent =
                c.id_categoria_padre ??
                c.parentId;

            if (
                parent != null &&
                ids.has(String(parent)) &&
                !ids.has(String(c.id))
            ) {
                ids.add(String(c.id));
                changed = true;
            }
        }
    }

    return ids;
}

/* ==========================================
   MENÚ LATERAL DE CATEGORÍAS
========================================== */

export function categoryMenu(categories, products, selected) {
    const nodes = new Map(
        categories.map(c => [
            String(c.id),
            {
                ...c,
                children: []
            }
        ])
    );

    const roots = [];

    for (const c of categories) {
        const node = nodes.get(String(c.id));

        const parent = nodes.get(
            String(
                c.id_categoria_padre ??
                c.parentId
            )
        );

        if (parent && parent !== node) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const count = id => {
        const ids = subcategoryIds(
            categories,
            id
        );

        return products.filter(
            p => ids.has(String(p.categoryId))
        ).length;
    };

    const subtreeSelected = node =>
        subcategoryIds(
            categories,
            node.id
        ).has(String(selected));

    const draw = (
        items,
        seen = new Set()
    ) => items.map(c => {
        if (seen.has(String(c.id))) {
            return '';
        }

        const next = new Set(seen);
        next.add(String(c.id));

        const active =
            String(c.id) === String(selected);

        return `
            <div class="fm-cat-node">

                <button
                    type="button"
                    class="fm-cat-option ${
                        active ? 'active' : ''
                    }"
                    data-category-select="${esc(c.id)}"
                    ${
                        active
                            ? 'aria-current="page"'
                            : ''
                    }
                >

                    <span>
                        ${esc(c.name)}
                    </span>

                    <em>
                        ${count(c.id)}
                    </em>

                </button>

                ${c.children.length ? `
                    <details
                        class="fm-cat-submenu"
                        ${subtreeSelected(c) ? 'open' : ''}
                    >

                        <summary>
                            Subcategorías ▾
                        </summary>

                        <div>
                            ${draw(c.children, next)}
                        </div>

                    </details>
                ` : ''}

            </div>
        `;

    }).join('');

    return `
        <details class="fm-category-menu" open>

            <summary class="fm-category-title">

                <span class="fm-menu-icon">
                    ☰
                </span>

                <span>
                    Explorar categorías

                    <small>
                        ${categories.length}
                        categorías disponibles
                    </small>
                </span>

                <span>
                    ⌄
                </span>

            </summary>

            <nav
                class="fm-category-list"
                aria-label="Categorías de productos"
            >

                <button
                    type="button"
                    class="fm-cat-option ${
                        selected ? '' : 'active'
                    }"
                    data-category-select=""
                >

                    <span>
                        Todas las categorías
                    </span>

                    <em>
                        ${products.length}
                    </em>

                </button>

                ${draw(roots)}

            </nav>

        </details>
    `;
}
