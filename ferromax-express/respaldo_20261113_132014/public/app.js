
import { ic, emo, header, footer, hero, benefits, infoStrip } from '/ui.js';

const $ = s => document.querySelector(s);
const app = $('#app');

const esc = v => String(v ?? '').replace(
    /[&<>"']/g,
    c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c])
);

const mxn = v => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
}).format(Number(v) || 0);

const norm = v => String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const imageUrl = v =>
    typeof v === 'string'
        ? v.trim()
        : String(
            v?.url ??
            v?.url_imagen ??
            v?.src ??
            v?.image ??
            ''
        ).trim();

const validImage = v =>
    /^(https?:\/\/|\/)/i.test(v || '');

const picture = p => validImage(p.image)
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : emo(p.name);

/* ==========================================
   API
========================================== */

async function api(url, options = {}) {
    const r = await fetch('/api' + url, {
        ...options,

        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },

        body: options.body === undefined
            ? undefined
            : JSON.stringify(options.body)
    });

    if (r.status === 204) return null;

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw Object.assign(
            new Error(data.error || `Error ${r.status}`),
            { fields: data.fields }
        );
    }

    return data;
}

const prod = id =>
    api('/products/' + encodeURIComponent(id));

function toast(message) {
    const el = document.createElement('div');

    el.className = 'fm-toast';
    el.setAttribute('role', 'status');
    el.textContent = message;

    document.body.append(el);

    setTimeout(() => el.remove(), 2200);
}

/* ==========================================
   USUARIO, CARRITO Y FAVORITOS
========================================== */

let user = null;
let cart = [];

try {
    cart = JSON.parse(
        localStorage.getItem('ferromax_cart') || '[]'
    );

    if (!Array.isArray(cart)) cart = [];

} catch {
    cart = [];
}

const favorites = new Set((() => {
    try {
        const a = JSON.parse(
            localStorage.getItem('ferromax_favorites') || '[]'
        );

        return Array.isArray(a)
            ? a.map(String)
            : [];

    } catch {
        return [];
    }
})());

const qtyOf = id =>
    cart.find(
        x => String(x.productId) === String(id)
    )?.quantity || 0;

async function refreshTotal() {
    try {
        const t = cart.length
            ? await api('/pricing', {
                method: 'POST',
                body: { lines: cart }
            })
            : null;

        if ($('#ct')) {
            $('#ct').textContent = mxn(
                t?.subtotal || 0
            );
        }

    } catch {}
}

function saveCart() {
    localStorage.setItem(
        'ferromax_cart',
        JSON.stringify(cart)
    );

    if ($('#cc')) {
        $('#cc').textContent = cart.reduce(
            (n, l) => n + Number(l.quantity),
            0
        );
    }

    refreshTotal();
}

function setQty(p, n) {
    n = Math.max(
        0,
        Math.min(
            Number(n) || 0,
            Number(p.stock) || 0
        )
    );

    cart = cart.filter(
        x => String(x.productId) !== String(p.id)
    );

    if (n) {
        cart.push({
            productId: p.id,
            quantity: n
        });
    }

    saveCart();
}

function toggleFavorite(id) {
    id = String(id);

    if (favorites.has(id)) {
        favorites.delete(id);
    } else {
        favorites.add(id);
    }

    localStorage.setItem(
        'ferromax_favorites',
        JSON.stringify([...favorites])
    );

    document.querySelectorAll(
        '[data-favorite]'
    ).forEach(b => {
        const on = favorites.has(
            b.dataset.favorite
        );

        b.classList.toggle(
            'is-favorite',
            on
        );

        b.setAttribute(
            'aria-pressed',
            String(on)
        );
    });

    toast(
        favorites.has(id)
            ? 'Agregado a favoritos'
            : 'Eliminado de favoritos'
    );
}

/* ==========================================
   GALERÍA DE PRODUCTOS
========================================== */

function gallery(p) {
    const all = [
        ...(Array.isArray(p.images) ? p.images : []),
        ...(Array.isArray(p.imagenes) ? p.imagenes : []),
        ...(Array.isArray(p.fotos) ? p.fotos : []),
        p.image,
        p.imagen
    ];

    const urls = [];

    for (const item of all) {
        const url = imageUrl(item);

        if (
            validImage(url) &&
            !urls.includes(url)
        ) {
            urls.push(url);
        }
    }

    return urls.slice(0, 5);
}

/* ==========================================
   NORMALIZAR ESPECIFICACIONES TÉCNICAS
========================================== */

function specifications(product) {
    const sources = [
        product.especificaciones_tecnicas,
        product.specifications,
        product.especificacionesTecnicas,
        product.especificaciones,
        product.specs
    ];

    for (let raw of sources) {
        if (raw == null || raw === '') {
            continue;
        }

        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch {
                raw = raw.split(/\r?\n/).filter(Boolean);
            }
        }

        if (
            raw &&
            !Array.isArray(raw) &&
            typeof raw === 'object'
        ) {
            raw = Array.isArray(raw.items)
                ? raw.items
                : Array.isArray(raw.especificaciones)
                    ? raw.especificaciones
                    : Object.entries(raw).map(
                        ([caracteristica, valor]) => ({
                            caracteristica,
                            valor
                        })
                    );
        }

        if (!Array.isArray(raw)) {
            continue;
        }

        const result = raw.map(item => {
            let name = '';
            let value = '';

            if (Array.isArray(item)) {
                name = String(item[0] ?? '');
                value = String(item[1] ?? '');

            } else if (typeof item === 'string') {
                const m = item.match(
                    /^(.+?)\s*(?:[:：|–—]|\s+-\s+)\s*(.+)$/
                );

                if (m) {
                    name = m[1];
                    value = m[2];
                }

            } else if (
                item &&
                typeof item === 'object'
            ) {
                name = String(
                    item.caracteristica ??
                    item.concepto ??
                    item.nombre ??
                    item.name ??
                    item.label ??
                    ''
                );

                value = String(
                    item.valor ??
                    item.medida ??
                    item.value ??
                    ''
                );
            }

            return {
                caracteristica: name.trim(),
                valor: value.trim()
            };

        }).filter(
            x => x.caracteristica && x.valor
        );

        if (result.length) {
            return result.slice(0, 30);
        }
    }

    return [];
}

/* ==========================================
   TABLA DE ESPECIFICACIONES TÉCNICAS
========================================== */

function tableSpecs(p) {
    const specs = specifications(p);

    if (!specs.length) {
        return `
            <section class="fm-spec">

                <h2>
                    Especificaciones técnicas
                </h2>

                <p class="fm-spec-empty">
                    Este producto aún no tiene
                    especificaciones registradas.
                </p>

            </section>
        `;
    }

    const rows = arr => arr.map(s => `
        <div class="fm-spec-row">

            <span>
                ${esc(s.caracteristica)}
            </span>

            <strong>
                ${esc(s.valor)}
            </strong>

        </div>
    `).join('');

    return `
        <section class="fm-spec">

            <h2>
                Especificaciones técnicas
            </h2>

            <div>
                ${rows(specs.slice(0, 6))}
            </div>

            ${specs.length > 6 ? `
                <details class="fm-spec-extra">

                    <summary>
                        + Más información
                    </summary>

                    ${rows(specs.slice(6))}

                </details>
            ` : ''}

        </section>
    `;
}

/* ==========================================
   TARJETAS DE PRODUCTOS
========================================== */

function card(p) {
    const id = String(p.id);

    const href =
        '#/producto/' + encodeURIComponent(id);

    const photos = gallery(p).slice(0, 3);

    const available = Number(p.stock) > 0;

    const rating = Math.min(
        5,
        Math.max(
            0,
            Number(
                p.rating ??
                p.averageRating ??
                p.calificacion_promedio
            ) || 0
        )
    );

    const reviews = Number(
        p.reviewCount ??
        p.ratingCount ??
        p.total_resenas
    ) || 0;

    return `
        <article class="fm-card">

            <div class="fm-card-media">

                <span class="fm-card-stock ${
                    available ? '' : 'off'
                }">
                    ${available ? 'DISPONIBLE' : 'AGOTADO'}
                </span>

                <button
                    type="button"
                    class="fm-heart ${
                        favorites.has(id) ? 'is-favorite' : ''
                    }"
                    data-favorite="${esc(id)}"
                    aria-label="Favorito"
                    aria-pressed="${favorites.has(id)}"
                >
                    ♡
                </button>

                <a
                    href="${href}"
                    class="fm-card-image"
                >
                    ${photos.length ? `
                        <img
                            src="${esc(photos[0])}"
                            alt="${esc(p.name)}"
                            loading="lazy"
                        >
                    ` : emo(p.name)}
                </a>

                <div class="fm-dots">

                    ${photos.map((url, i) => `
                        <button
                            type="button"
                            class="fm-dot ${
                                i === 0 ? 'active' : ''
                            }"
                            data-photo-index="${i}"
                            data-photo-src="${esc(url)}"
                            aria-label="Foto ${i + 1}"
                            aria-pressed="${i === 0}"
                        ></button>
                    `).join('')}

                </div>

            </div>

            <div class="fm-card-body">

                <span class="fm-card-brand">
                    ${esc(p.brand || 'FerreMax')}
                </span>

                <a
                    href="${href}"
                    class="fm-card-name"
                >
                    ${esc(p.name)}
                </a>

                <div class="fm-card-rating">

                    <span class="fm-stars">

                        ${[1, 2, 3, 4, 5].map(n => `
                            <span class="${
                                rating >= n - .49
                                    ? 'on'
                                    : ''
                            }">
                                ★
                            </span>
                        `).join('')}

                    </span>

                    <small>
                        ${rating
                            ? rating.toFixed(1) +
                              (reviews ? ` (${reviews})` : '')
                            : 'Sin reseñas'
                        }
                    </small>

                </div>

                <strong class="fm-card-price">
                    ${mxn(p.price)}
                </strong>

                <button
                    type="button"
                    class="fm-card-add"
                    ${
                        available
                            ? `data-add="${esc(id)}"`
                            : 'disabled'
                    }
                >
                    ${available
                        ? 'Agregar al carrito'
                        : 'Producto agotado'
                    }
                </button>

            </div>

        </article>
    `;
}

const grid = arr => `
    <div class="fm-products">
        ${arr.map(card).join('')}
    </div>
`;

const head = (
    title,
    url = '#/catalogo',
    label = 'Ver todas'
) => `
    <div class="fm-section-head">

        <h2>
            ${title}
        </h2>

        <a href="${url}">
            ${label}
            ${ic('arrowR', 'h-4 w-4')}
        </a>

    </div>
`;

const carousel = (
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

const empty = (
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

const catTile = (c, ps) => {
    const p = ps.find(
        p =>
            String(p.categoryId) === String(c.id) &&
            validImage(p.image)
    );

    return `
        <a
            class="fm-cat-tile"
            href="#/catalogo?categoryId=${
                encodeURIComponent(c.id)
            }"
        >

            <div>
                ${p ? `
                    <img
                        src="${esc(p.image)}"
                        alt=""
                    >
                ` : emo(c.name)}
            </div>

            <strong>
                ${esc(c.name)}
            </strong>

            <small>
                Ver productos →
            </small>

        </a>
    `;
};

/* ==========================================
   CATEGORÍAS Y SUBCATEGORÍAS
========================================== */

function categoryFromURL(qs, categories) {
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

function subcategoryIds(categories, id) {
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

function categoryMenu(categories, products, selected) {
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

/* ==========================================
   FICHA DE PRODUCTO
========================================== */

function productPage(p) {
    const photos = gallery(p);

    const stock = Math.max(
        0,
        Number(p.stock) || 0
    );

    const available = Math.max(
        0,
        stock - qtyOf(p.id)
    );

    const price = Number(p.price) || 0;

    const old = Number(
        p.originalPrice ??
        p.original_price ??
        p.precio_anterior
    ) || 0;

    const discount =
        old > price && price > 0
            ? Math.round((1 - price / old) * 100)
            : 0;

    const rating = Number(
        p.rating ??
        p.averageRating ??
        p.calificacion_promedio
    ) || 0;

    const reviews = Number(
        p.reviewCount ??
        p.ratingCount ??
        p.total_resenas
    ) || 0;

    const unit =
        p.unit ||
        p.unidad_venta ||
        '';

    return `
        <div class="fm-pdp">

            <!-- GALERÍA DE PRODUCTO -->

            <div class="fm-gallery">

                <div
                    class="fm-thumbs"
                    aria-label="Fotos del producto"
                >

                    ${photos.map((src, i) => `
                        <button
                            type="button"
                            class="fm-thumb ${
                                i === 0 ? 'active' : ''
                            }"
                            data-pdp-thumb="${i}"
                            aria-label="Foto ${i + 1}"
                            aria-pressed="${i === 0}"
                        >

                            <img
                                src="${esc(src)}"
                                alt="Vista ${i + 1} de ${
                                    esc(p.name)
                                }"
                            >

                        </button>
                    `).join('')}

                </div>

                <div class="fm-photo-wrap">

                    ${photos.length ? `
                        <button
                            type="button"
                            class="fm-photo-main"
                            data-pdp-zoom
                            aria-pressed="false"
                            aria-label="Activar lupa"
                        >

                            <img
                                class="fm-photo-img"
                                src="${esc(photos[0])}"
                                alt="${esc(p.name)}"
                            >

                            <span
                                class="fm-lens"
                                aria-hidden="true"
                            ></span>

                            <span class="fm-zoom-label">
                                ⌕

                                <span class="fm-zoom-text">
                                    Activar lupa
                                </span>
                            </span>

                        </button>

                        <div class="fm-photo-nav">

                            <button
                                type="button"
                                data-pdp-arrow="-1"
                                aria-label="Foto anterior"
                            >
                                ‹
                            </button>

                            <span class="fm-photo-count">
                                1 / ${photos.length}
                            </span>

                            <button
                                type="button"
                                data-pdp-arrow="1"
                                aria-label="Foto siguiente"
                            >
                                ›
                            </button>

                        </div>
                    ` : `
                        <div
                            class="fm-photo-main fm-no-photo"
                        >
                            ${emo(p.name)}
                        </div>
                    `}

                    <p class="fm-photo-help">

                        ${photos.length
                            ? `Selecciona una foto o usa las flechas.
                               Haz clic en la imagen para usar la lupa.`
                            : `Este producto aún no tiene fotografías.`
                        }

                    </p>

                </div>

            </div>

            <!-- INFORMACIÓN DEL PRODUCTO -->

            <section class="fm-product-info">

                <a
                    class="fm-back"
                    href="#/catalogo"
                >
                    ← Volver al catálogo
                </a>

                <span class="fm-brand">
                    ${esc(p.brand || 'FerreMax')}
                </span>

                <h1>
                    ${esc(p.name)}
                </h1>

                <div class="fm-meta">

                    <span>
                        SKU: ${esc(p.sku || 'No disponible')}
                    </span>

                    ${rating > 0 ? `
                        <span>
                            ★ ${rating.toFixed(1)}

                            ${reviews
                                ? `(${reviews} reseñas)`
                                : ''
                            }
                        </span>
                    ` : ''}

                </div>

                <!-- PRECIO -->

                <div class="fm-price-block">

                    <small>
                        PRECIO DE VENTA
                    </small>

                    <div>

                        <strong>
                            ${mxn(price)}
                        </strong>

                        ${discount ? `
                            <span>
                                -${discount}%
                            </span>
                        ` : ''}

                    </div>

                    ${discount ? `
                        <del>
                            Antes: ${mxn(old)}
                        </del>
                    ` : ''}

                </div>

                <!-- DISPONIBILIDAD -->

                <div class="fm-stock ${
                    stock ? '' : 'out'
                }">

                    ●

                    ${stock
                        ? `Disponible · ${stock} en existencia`
                        : 'Producto agotado'
                    }

                </div>

                <!-- DESCRIPCIÓN -->

                ${p.description ? `
                    <section class="fm-description">

                        <h2>
                            Descripción del producto
                        </h2>

                        <p>
                            ${esc(p.description)}
                        </p>

                    </section>
                ` : ''}

                <!-- ESPECIFICACIONES TÉCNICAS -->

                ${tableSpecs(p)}

                <!-- UNIDAD -->

                ${unit ? `
                    <p class="fm-unit">

                        Unidad de venta:

                        <strong>
                            ${esc(unit)}
                        </strong>

                    </p>
                ` : ''}

                <!-- COMPRA -->

                <div class="fm-purchase">

                    ${available ? `
                        <label>
                            Cantidad

                            <input
                                id="qn"
                                type="number"
                                min="1"
                                max="${available}"
                                value="1"
                            >
                        </label>

                        <button
                            type="button"
                            class="fm-buy"
                            data-addn="${esc(p.id)}"
                        >

                            ${ic('cart', 'h-5 w-5')}

                            Agregar al carrito

                        </button>
                    ` : `
                        <p>
                            ${stock
                                ? `Ya tienes todas las unidades
                                   disponibles en el carrito.`
                                : 'Sin existencias.'
                            }
                        </p>
                    `}

                    <a
                        href="#/carrito"
                        class="fm-view-cart"
                    >
                        Ver mi carrito
                    </a>

                </div>

                <small class="fm-demo-note">
                    Sitio de demostración.
                    No se realizan cobros reales.
                </small>

            </section>

        </div>
    `;
}

/* ==========================================
   FERROMAX - LOGOTIPOS DE MARCAS
========================================== */

const LOGOS_MARCAS = {
    urrea: '/urrea.png',
    truper: '/truper.webp',
    fester: '/fester.png',
    comex: '/comex.png',
    petrul: '/petrul.png',
    phillips: '/phillips.png'
};

function claveMarca(nombre) {
    return String(nombre || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function tarjetaMarca(marca) {
    const nombre = String(
        marca.name || marca.nombre || ''
    ).trim();

    const clave = claveMarca(nombre);

    
const logo =
    marca.logo ||
    marca.logo_url ||
    LOGOS_MARCAS[clave] ||
    '';


    const enlace =
        '#/catalogo?brand=' +
        encodeURIComponent(nombre);

    return `
        <a
            href="${enlace}"
            class="fm-brand-card"
            title="Ver productos de ${esc(nombre)}"
            aria-label="Ver productos de ${esc(nombre)}"
        >
            <span class="fm-brand-fallback">
                ${esc(nombre)}
            </span>

            ${logo ? `
                <img
                    src="${esc(logo)}"
                    alt="Logotipo ${esc(nombre)}"
                    loading="lazy"
                    onerror="this.remove()"
                >
            ` : ''}
        </a>
    `;
}


/* ==========================================
   RUTAS DE LA TIENDA
========================================== */

const routes = {

    /* INICIO */

    async home() {
        const [
            categories,
            products,
            brands
        ] = await Promise.all([
            api('/categories'),
            api('/products'),
            api('/brands')
        ]);

        app.innerHTML = `

            <section id="hero">
                ${hero(0)}
            </section>

            ${benefits()}

            <section class="fm-home-section">

                ${head('Categorías principales')}

                <div class="fm-home-cats">

                    ${categories.slice(0, 6).map(
                        c => catTile(c, products)
                    ).join('')}

                </div>

            </section>

<section class="fm-home-section">

    ${head('Productos recientes')}

    ${products.length ? `
        <div class="fm-product-carousel">

            ${carousel(
                products.slice(0, 12).map(card),
                '280px'
            )}

        </div>
    ` : '<p>Sin productos.</p>'}

</section>

            <section class="fm-home-section">

                ${head(
                    'Marcas que manejamos',
                    '#/marcas',
                    'Ver todas'
                )}


${brands.length
    ? carousel(
        brands.map(marca =>
            tarjetaMarca(marca)
        ),
        '180px'
    )
    : '<p>No hay marcas registradas.</p>'
}


            </section>

            ${infoStrip()}
        `;
    },

    /* MARCAS */

  
/* ==========================================
   PÁGINA DE TODAS LAS MARCAS
========================================== */

async marcas() {

    const brands = await api('/brands');

    app.innerHTML = `

        <section class="fm-brands-page">

            <div class="fm-brands-page-header">

                <span class="fm-brands-label">
                    MARCAS FERROMAX
                </span>

                <h1>
                    Trabajamos con las mejores marcas
                </h1>

                <p>
                    Explora nuestras marcas y encuentra
                    las herramientas y productos que necesitas.
                </p>

            </div>

            ${brands.length ? `

                <div class="fm-brands-grid">

                    ${brands.map(marca =>
                        tarjetaMarca(marca)
                    ).join('')}

                </div>

            ` : `

                <p class="fm-brands-empty">
                    No hay marcas disponibles.
                </p>

            `}

        </section>
    `;
},


    /* CATÁLOGO */

    async catalogo(_, qs) {
        const g = k => qs.get(k) || '';

        const [
            categories,
            all,
            brands
        ] = await Promise.all([
            api('/categories'),
            api('/products'),
            api('/brands')
        ]);

        const cat = categoryFromURL(
            qs,
            categories
        );

        const descendants =
            cat.requested && cat.exists
                ? subcategoryIds(
                    categories,
                    cat.id
                )
                : null;

        const query = norm(g('q'));
        const brand = norm(g('brand'));

        const max = g('maxPrice') === ''
            ? null
            : Number(g('maxPrice'));

        const products = all.filter(p => {
            const categoryMatch =
                !cat.requested ||
                (
                    cat.exists &&
                    descendants.has(String(p.categoryId))
                );

            const brandMatch =
                !brand ||
                norm(p.brand) === brand;

            const searchMatch =
                !query ||
                norm([
                    p.name,
                    p.sku,
                    p.brand
                ].join(' ')).includes(query);

            const priceMatch =
                max === null ||
                (
                    Number.isFinite(max) &&
                    Number(p.price) <= max
                );

            return (
                categoryMatch &&
                brandMatch &&
                searchMatch &&
                priceMatch
            );
        });

        if (g('sort') === 'precio-asc') {
            products.sort(
                (a, b) =>
                    Number(a.price) - Number(b.price)
            );
        }

        if (g('sort') === 'precio-desc') {
            products.sort(
                (a, b) =>
                    Number(b.price) - Number(a.price)
            );
        }

        if (g('sort') === 'nombre') {
            products.sort(
                (a, b) =>
                    String(a.name).localeCompare(
                        String(b.name),
                        'es-MX'
                    )
            );
        }

        const option = (
            value,
            label,
            current
        ) => `
            <option
                value="${esc(value)}"
                ${
                    String(value) === String(current)
                        ? 'selected'
                        : ''
                }
            >
                ${esc(label)}
            </option>
        `;

        app.innerHTML = `

            <div class="fm-catalog-layout">

                <form
                    id="ff"
                    aria-label="Filtros"
                >

                    <h2>
                        Filtros
                    </h2>

                    <label>
                        Buscar

                        <input
                            name="q"
                            class="field"
                            value="${esc(g('q'))}"
                            placeholder="Nombre, marca o SKU"
                        >
                    </label>

                    <div class="fm-category-filter">

                        <label>
                            Categorías
                        </label>

                        <input
                            type="hidden"
                            name="categoryId"
                            value="${esc(cat.id)}"
                        >

                        ${categoryMenu(
                            categories,
                            all,
                            cat.id
                        )}

                    </div>

                    <label>
                        Marca

                        <select
                            name="brand"
                            class="field"
                        >
                            ${option(
                                '',
                                'Todas',
                                g('brand')
                            )}

                            ${brands.map(b =>
                                option(
                                    b.name,
                                    b.name,
                                    g('brand')
                                )
                            ).join('')}
                        </select>
                    </label>

                    <label>
                        Precio máximo (MXN)

                        <input
                            class="field"
                            type="number"
                            min="0"
                            step="0.01"
                            name="maxPrice"
                            value="${esc(g('maxPrice'))}"
                        >
                    </label>

                    <label>
                        Ordenar

                        <select
                            class="field"
                            name="sort"
                        >

                            ${[
                                ['', 'Relevancia'],
                                [
                                    'precio-asc',
                                    'Precio: menor a mayor'
                                ],
                                [
                                    'precio-desc',
                                    'Precio: mayor a menor'
                                ],
                                [
                                    'nombre',
                                    'Nombre: A-Z'
                                ]
                            ].map(([v, l]) =>
                                option(
                                    v,
                                    l,
                                    g('sort')
                                )
                            ).join('')}

                        </select>
                    </label>

                    <button
                        type="submit"
                        class="btn"
                    >
                        Aplicar filtros
                    </button>

                    <a href="#/catalogo">
                        Limpiar filtros
                    </a>

                </form>

                <section class="fm-catalog-results">

                    <h1>
                        ${esc(
                            cat.requested
                                ? cat.name
                                : 'Todos los productos'
                        )}
                    </h1>

                    <p>
                        ${products.length} resultado(s)
                    </p>

                    ${!cat.exists ? `
                        <p>
                            Categoría no registrada:
                            ${esc(cat.name)}
                        </p>
                    ` : products.length
                        ? grid(products)
                        : `
                            <p>
                                No hay productos que coincidan
                                con los filtros.
                            </p>
                        `
                    }

                </section>

            </div>
        `;

        const menu = app.querySelector(
            '.fm-category-list'
        );

        if (menu) {
            menu.scrollTop = categoryScroll;
        }
    },

    /* DETALLE DEL PRODUCTO */

    async producto([id]) {
        const p = await prod(id).catch(() => null);

        app.innerHTML = p
            ? productPage(p)
            : empty('Producto no encontrado');
    },

    /* CARRITO */

    async carrito() {
        if (!cart.length) {
            app.innerHTML = empty(
                'Tu carrito está vacío'
            );

            return;
        }

        const t = await api('/pricing', {
            method: 'POST',
            body: { lines: cart }
        });

        if (!t.items?.length) {
            cart = [];
            saveCart();

            app.innerHTML = empty(
                'Tu carrito está vacío'
            );

            return;
        }

        app.innerHTML = `

            <h1 class="fm-page-title">
                Carrito
            </h1>

            ${t.items.map(i => `
                <div class="fm-cart-row">

                    <span>
                        ${esc(i.name)}
                    </span>

                    <span>
                        ${mxn(i.unitPrice)}
                    </span>

                    <div>

                        <button
                            type="button"
                            class="btn"
                            data-dec="${esc(i.productId)}"
                        >
                            −
                        </button>

                        ${i.quantity}

                        <button
                            type="button"
                            class="btn"
                            data-inc="${esc(i.productId)}"
                        >
                            +
                        </button>

                    </div>

                    <strong>
                        ${mxn(i.subtotal)}
                    </strong>

                    <button
                        type="button"
                        class="btn"
                        data-rm="${esc(i.productId)}"
                    >
                        Eliminar
                    </button>

                </div>
            `).join('')}

            <p>
                Subtotal: ${mxn(t.subtotal)}
            </p>

            <p>
                Envío: ${mxn(t.shipping)}
            </p>

            <h2>
                Total: ${mxn(t.total)}
            </h2>

            <div class="fm-actions">

                <button
                    class="btn"
                    type="button"
                    data-clear
                >
                    Vaciar
                </button>

                <a
                    class="btn"
                    href="#/catalogo"
                >
                    Continuar comprando
                </a>

                <a
                    class="btn"
                    href="#/checkout"
                >
                    Ir al checkout
                </a>

            </div>
        `;
    },

    /* CHECKOUT */

    async checkout() {
        if (!cart.length) {
            app.innerHTML = empty(
                'No hay productos para comprar'
            );

            return;
        }

        if (!user) {
            app.innerHTML = empty(
                'Inicia sesión para crear un pedido de demostración',
                '#/cuenta',
                'Ir a mi cuenta'
            );

            return;
        }

        const t = await api('/pricing', {
            method: 'POST',
            body: { lines: cart }
        });

        const field = (
            name,
            label,
            type = 'text'
        ) => `
            <label>
                ${label} *

                <input
                    name="${name}"
                    type="${type}"
                    class="field"
                    required
                >

                <span
                    data-err="${name}"
                    class="fm-error"
                ></span>
            </label>
        `;

        const address = {
            calle: 'Calle',
            numeroExterior: 'Número exterior',
            colonia: 'Colonia',
            codigoPostal: 'Código postal',
            ciudad: 'Ciudad',
            estado: 'Estado'
        };

        app.innerHTML = `

            <form id="co" class="fm-form">

                <h1>
                    Checkout (demostración)
                </h1>

                <p>
                    ${t.items.map(i =>
                        `${i.quantity} × ${esc(i.name)}`
                    ).join(', ')}

                    — Total ${mxn(t.total)}
                </p>

                ${field('name', 'Nombre')}

                ${field('email', 'Correo', 'email')}

                ${Object.entries(address).map(
                    ([n, l]) => field(n, l)
                ).join('')}

                <label>
                    Entrega

                    <select
                        name="delivery"
                        class="field"
                    >
                        <option value="domicilio">
                            A domicilio
                        </option>

                        <option value="sucursal">
                            Recoger en sucursal
                        </option>
                    </select>
                </label>

                <label>
                    Pago (ilustrativo)

                    <select
                        name="paymentMethod"
                        class="field"
                    >
                        <option value="tarjeta">
                            Tarjeta
                        </option>

                        <option value="transferencia">
                            Transferencia
                        </option>

                        <option value="tienda">
                            Pago en tienda
                        </option>
                    </select>
                </label>

                <p>
                    No se solicitan datos bancarios
                    ni se realiza ningún cobro.
                </p>

                <p
                    id="ce"
                    class="fm-error"
                    role="alert"
                ></p>

                <button class="btn">
                    Confirmar pedido de demostración
                </button>

            </form>
        `;
    },

    /* PEDIDOS */

    async pedidos() {
        const orders = await api('/orders');

        app.innerHTML = `

            <h1 class="fm-page-title">
                Mis pedidos (demostración)
            </h1>

            ${orders.length
                ? orders.map(o => `
                    <article class="fm-order">

                        <b>
                            ${esc(o.id)}
                        </b>

                        · ${new Date(
                            o.createdAt
                        ).toLocaleString('es-MX')}

                        <p>
                            ${esc(o.status)}
                            · Pago:
                            ${esc(o.paymentStatus || '')}
                        </p>

                        <ul>
                            ${(o.items || []).map(i => `
                                <li>
                                    ${i.quantity}
                                    × ${esc(i.name)}
                                    — ${mxn(i.subtotal)}
                                </li>
                            `).join('')}
                        </ul>

                        <strong>
                            Total ${mxn(o.total)}
                        </strong>

                    </article>
                `).join('')
                : '<p>Aún no tienes pedidos.</p>'
            }
        `;
    },

    /* CUENTA */

    async cuenta() {
        if (user) {
            app.innerHTML = `

                <section class="fm-form">

                    <h1>
                        Mi cuenta
                    </h1>

                    <p>
                        Nombre: ${esc(user.name)}
                    </p>

                    <p>
                        Correo: ${esc(user.email)}
                    </p>

                    ${user.isDemo ? `
                        <p>
                            Sesión de demostración
                        </p>
                    ` : ''}

                    <div class="fm-actions">

                        <a
                            class="btn"
                            href="#/pedidos"
                        >
                            Mis pedidos
                        </a>

                        <button
                            type="button"
                            class="btn"
                            data-logout
                        >
                            Cerrar sesión
                        </button>

                    </div>

                </section>
            `;

            return;
        }

        const cfg = await api('/config');

        const input = (
            name,
            label,
            type = 'text',
            ac = ''
        ) => `
            <label>
                ${label}

                <input
                    name="${name}"
                    type="${type}"
                    autocomplete="${ac}"
                    class="field"
                    required
                >
            </label>
        `;

        app.innerHTML = `

            <div class="fm-account">

                <form id="lf" class="fm-form">

                    <h1>
                        Iniciar sesión
                    </h1>

                    ${input(
                        'email',
                        'Correo',
                        'email',
                        'email'
                    )}

                    ${input(
                        'password',
                        'Contraseña',
                        'password',
                        'current-password'
                    )}

                    <button class="btn">
                        Entrar
                    </button>

                </form>

                <form id="rf" class="fm-form">

                    <h1>
                        Crear cuenta
                    </h1>

                    ${input(
                        'name',
                        'Nombre',
                        'text',
                        'given-name'
                    )}

                    ${input(
                        'apellido',
                        'Apellido paterno',
                        'text',
                        'family-name'
                    )}

                    ${input(
                        'email',
                        'Correo',
                        'email',
                        'email'
                    )}

                    ${input(
                        'password',
                        'Contraseña (mínimo 8 caracteres)',
                        'password',
                        'new-password'
                    )}

                    <button class="btn">
                        Crear cuenta
                    </button>

                </form>

            </div>

            <p
                id="ae"
                class="fm-error"
                role="alert"
            ></p>

            <div class="fm-auth-actions">

                ${cfg.googleClientId
                    ? '<div id="gbtn"></div>'
                    : '<p>Google no configurado.</p>'
                }

                <button
                    type="button"
                    class="btn"
                    data-demo
                >
                    Entrar como usuario de prueba
                </button>

            </div>
        `;

        if (cfg.googleClientId) {
            initGoogle(cfg.googleClientId);
        }
    },

    /* INFORMACIÓN */

    async info([slug]) {
        const names = {
            faq: 'Preguntas frecuentes',
            privacidad: 'Política de privacidad',
            terminos: 'Términos y condiciones',
            envios: 'Envíos y devoluciones',
            nosotros: 'Nosotros',
            contacto: 'Contacto'
        };

        app.innerHTML = names[slug]
            ? `
                <h1 class="fm-page-title">
                    ${names[slug]}
                </h1>

                <p>
                    Texto demostrativo pendiente
                    de definir por el cliente.
                </p>
            `
            : empty(
                '404 · Página no encontrada',
                '#/',
                'Inicio'
            );
    }
};


/* ==========================================
   CARRUSEL AUTOMÁTICO DE MARCAS
========================================== */

let intervaloCarruselMarcas = null;

function iniciarCarruselMarcas() {

    clearInterval(intervaloCarruselMarcas);

    const slider = document.querySelector(
        '[data-fm-brands-slider]'
    );

    if (!slider) return;

    const track = slider.querySelector(
        '[data-fm-brands-track]'
    );

    if (!track) return;

    const botones = slider.querySelectorAll(
        '[data-brand-direction]'
    );

    const hayDesbordamiento = () =>
        track.scrollWidth > track.clientWidth + 4;

    function mover(direccion = 1) {

        if (!hayDesbordamiento()) return;

        const tarjeta = track.querySelector(
            '.fm-brand-slide'
        );

        const ancho = tarjeta
            ? tarjeta.getBoundingClientRect().width
            : 180;

        const espacio =
            parseFloat(getComputedStyle(track).gap) || 16;

        const paso = ancho + espacio;

        const maximo =
            track.scrollWidth - track.clientWidth;

        let destino =
            track.scrollLeft + direccion * paso;

        if (direccion > 0 && destino > maximo - 4) {
            destino = 0;
        }

        if (direccion < 0 && destino < 0) {
            destino = maximo;
        }

        track.scrollTo({
            left: destino,
            behavior: 'smooth'
        });
    }

    botones.forEach(boton => {

        boton.hidden = !hayDesbordamiento();

        boton.addEventListener('click', () => {
            mover(
                Number(boton.dataset.brandDirection)
            );
        });

    });

    if (
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches
    ) {
        return;
    }

    intervaloCarruselMarcas = setInterval(() => {

        if (!slider.isConnected) {
            clearInterval(intervaloCarruselMarcas);
            return;
        }

        if (
            document.hidden ||
            slider.matches(':hover') ||
            slider.contains(document.activeElement)
        ) {
            return;
        }

        mover(1);

    }, 4500);
}


/* ==========================================
   INICIO DE SESIÓN CON GOOGLE
========================================== */

const loadGsi = () => new Promise(
    (resolve, reject) => {
        if (window.google?.accounts) {
            return resolve();
        }

        const script = document.createElement('script');

        script.src =
            'https://accounts.google.com/gsi/client';

        script.onload = resolve;

        script.onerror = () => reject(
            new Error('No se pudo cargar Google')
        );

        document.head.append(script);
    }
);

async function initGoogle(id) {
    try {
        await loadGsi();

        google.accounts.id.initialize({
            client_id: id,

            callback: async r => {
                try {
                    user = await api('/auth/google', {
                        method: 'POST',
                        body: {
                            credential: r.credential
                        }
                    });

                    render();

                } catch (e) {
                    if ($('#ae')) {
                        $('#ae').textContent = e.message;
                    }
                }
            }
        });

        google.accounts.id.renderButton(
            $('#gbtn'),
            {
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                locale: 'es'
            }
        );

    } catch (e) {
        if ($('#ae')) {
            $('#ae').textContent = e.message;
        }
    }
}

/* ==========================================
   NAVEGACIÓN
========================================== */

let renderNumber = 0;
let categoryScroll = 0;

async function render() {
    const current = ++renderNumber;

    const [path, q = ''] =
        location.hash.slice(2).split('?');

    const [name, ...args] = path.split('/');

    app.className =
        name === 'catalogo'
            ? 'fm-catalog-page'
            : name === 'producto'
                ? 'fm-product-page'
                : name
                    ? 'fm-normal-page'
                    : '';

    app.innerHTML = `
        <p role="status">
            Cargando…
        </p>
    `;

iniciarCarruselMarcas();


    document.querySelectorAll(
        '#nav a'
    ).forEach(a => {
        a.toggleAttribute(
            'aria-current',
            a.dataset.r === (name || 'home')
        );
    });

    if ($('#acc')) {
        $('#acc').textContent = user
            ? 'Mi cuenta'
            : 'Iniciar sesión';
    }

    try {
        const route = routes[name || 'home'];

        if (route) {
            await route(
                args,
                new URLSearchParams(q)
            );

        } else {
            app.innerHTML = empty(
                '404 · Página no encontrada',
                '#/',
                'Inicio'
            );
        }

    } catch (e) {
        if (current === renderNumber) {
            app.innerHTML = `
                <p
                    class="fm-error"
                    role="alert"
                >
                    No se pudo cargar:
                    ${esc(e.message)}
                </p>
            `;
        }
    }
}

/* ==========================================
   CAMBIAR FOTOGRAFÍA PRINCIPAL
========================================== */

function changeMainPhoto(galleryEl, index) {
    const thumbs = [
        ...galleryEl.querySelectorAll(
            '[data-pdp-thumb]'
        )
    ];

    if (!thumbs.length) return;

    index = (
        index + thumbs.length
    ) % thumbs.length;

    const src = thumbs[index]
        .querySelector('img')
        ?.src;

    const main = galleryEl.querySelector(
        '[data-pdp-zoom]'
    );

    const img = main?.querySelector(
        '.fm-photo-img'
    );

    if (!img || !src) return;

    img.src = src;

    main.classList.remove('zoomed');

    main.setAttribute(
        'aria-pressed',
        'false'
    );

    const lens = main.querySelector(
        '.fm-lens'
    );

    if (lens) {
        lens.style.opacity = '0';
    }

    const label = main.querySelector(
        '.fm-zoom-text'
    );

    if (label) {
        label.textContent = 'Activar lupa';
    }

    thumbs.forEach((b, i) => {
        b.classList.toggle(
            'active',
            i === index
        );

        b.setAttribute(
            'aria-pressed',
            String(i === index)
        );
    });

    const counter = galleryEl.querySelector(
        '.fm-photo-count'
    );

    if (counter) {
        counter.textContent =
            `${index + 1} / ${thumbs.length}`;
    }
}

/* ==========================================
   ZOOM CON LUPA
========================================== */

function updateMagnifier(main, clientX, clientY) {
    const img = main.querySelector(
        '.fm-photo-img'
    );

    const lens = main.querySelector(
        '.fm-lens'
    );

    if (
        !img ||
        !lens ||
        !img.complete ||
        !img.naturalWidth ||
        !img.naturalHeight
    ) {
        return;
    }

    const rect = main.getBoundingClientRect();

    const x = Math.max(
        0,
        Math.min(
            clientX - rect.left,
            rect.width
        )
    );

    const y = Math.max(
        0,
        Math.min(
            clientY - rect.top,
            rect.height
        )
    );

    const fit = Math.min(
        rect.width / img.naturalWidth,
        rect.height / img.naturalHeight
    );

    const w = img.naturalWidth * fit;
    const h = img.naturalHeight * fit;

    const padX = (rect.width - w) / 2;
    const padY = (rect.height - h) / 2;

    const zoom = 2.5;

    const size = lens.getBoundingClientRect().width;

    lens.style.left = x + 'px';
    lens.style.top = y + 'px';

    lens.style.backgroundImage = `url("${
        (img.currentSrc || img.src).replace(/"/g, '%22')
    }")`;

    lens.style.backgroundSize = `
        ${w * zoom}px
        ${h * zoom}px
    `;

    lens.style.backgroundPosition = `
        ${size / 2 - (x - padX) * zoom}px
        ${size / 2 - (y - padY) * zoom}px
    `;

    lens.style.opacity = '1';
}

/* SEGUIR EL CURSOR */

document.addEventListener(
    'pointermove',
    e => {
        const main = e.target.closest?.(
            '[data-pdp-zoom]'
        );

        if (
            main?.classList.contains('zoomed')
        ) {
            updateMagnifier(
                main,
                e.clientX,
                e.clientY
            );
        }
    }
);

/* OCULTAR LA LUPA AL SALIR */

document.addEventListener(
    'pointerout',
    e => {
        const main = e.target.closest?.(
            '[data-pdp-zoom]'
        );

        if (
            main &&
            !main.contains(e.relatedTarget)
        ) {
            const lens = main.querySelector(
                '.fm-lens'
            );

            if (lens) {
                lens.style.opacity = '0';
            }
        }
    }
);

/* ==========================================
   EVENTOS DE CLIC
========================================== */

document.addEventListener(
    'click',
    async e => {
        const b = e.target.closest('button');

        if (!b) return;

        const d = b.dataset;

        try {

            /* MINIATURAS */

            if ('pdpThumb' in d) {
                const g = b.closest('.fm-gallery');

                changeMainPhoto(
                    g,
                    Number(d.pdpThumb)
                );

                return;
            }

            /* FLECHAS DE FOTOGRAFÍAS */

            if ('pdpArrow' in d) {
                const g = b.closest('.fm-gallery');

                const thumbs = [
                    ...g.querySelectorAll(
                        '[data-pdp-thumb]'
                    )
                ];

                const current = thumbs.findIndex(
                    t => t.classList.contains('active')
                );

                changeMainPhoto(
                    g,
                    current + Number(d.pdpArrow)
                );

                return;
            }

            /* ACTIVAR O DESACTIVAR LUPA */

            if ('pdpZoom' in d) {
                const active = b.classList.toggle(
                    'zoomed'
                );

                b.setAttribute(
                    'aria-pressed',
                    String(active)
                );

                b.setAttribute(
                    'aria-label',
                    active
                        ? 'Desactivar lupa'
                        : 'Activar lupa'
                );

                const label = b.querySelector(
                    '.fm-zoom-text'
                );

                if (label) {
                    label.textContent = active
                        ? 'Desactivar lupa'
                        : 'Activar lupa';
                }

                const lens = b.querySelector(
                    '.fm-lens'
                );

                if (active) {
                    const r = b.getBoundingClientRect();

                    updateMagnifier(
                        b,

                        e.detail === 0
                            ? r.left + r.width / 2
                            : e.clientX,

                        e.detail === 0
                            ? r.top + r.height / 2
                            : e.clientY
                    );

                } else if (lens) {
                    lens.style.opacity = '0';
                }

                return;
            }

            /* SELECCIONAR CATEGORÍA */

            if ('categorySelect' in d) {
                e.preventDefault();

                const f = b.closest('#ff');

                if (!f) return;

                const list = b.closest(
                    '.fm-category-list'
                );

                if (list) {
                    categoryScroll = list.scrollTop;
                }

                f.elements.categoryId.value =
                    d.categorySelect;

                const p = new URLSearchParams(
                    [...new FormData(f)].filter(
                        ([, v]) => v !== ''
                    )
                );

                const next =
                    '#/catalogo' +
                    (p.size ? '?' + p : '');

                if (location.hash === next) {
                    render();
                } else {
                    location.hash = next;
                }

                return;
            }

            /* CAMBIAR FOTO DE TARJETA */

            if ('photoIndex' in d) {
                const productCard = b.closest(
                    '.fm-card'
                );

                const img = productCard?.querySelector(
                    '.fm-card-image img'
                );

                if (!img || !d.photoSrc) {
                    return;
                }

                img.src = d.photoSrc;

                productCard.querySelectorAll(
                    '[data-photo-index]'
                ).forEach(dot => {
                    const active = dot === b;

                    dot.classList.toggle(
                        'active',
                        active
                    );

                    dot.setAttribute(
                        'aria-pressed',
                        String(active)
                    );
                });

                return;
            }

            /* FAVORITOS */

            if ('favorite' in d) {
                toggleFavorite(d.favorite);
                return;
            }

            /* AGREGAR AL CARRITO */

            if (d.add) {
                const p = await prod(d.add);

                setQty(
                    p,
                    qtyOf(p.id) + 1
                );

                toast('Agregado al carrito');
                return;
            }

            /* AGREGAR DESDE LA FICHA */

            if (d.addn) {
                const p = await prod(d.addn);

                const amount = Math.max(
                    1,
                    Math.min(
                        Number($('#qn')?.value) || 1,
                        Number($('#qn')?.max) || 1
                    )
                );

                setQty(
                    p,
                    qtyOf(p.id) + amount
                );

                toast('Agregado al carrito');

                render();
                return;
            }

            /* CANTIDADES */

            if (d.inc || d.dec) {
                const id = d.inc || d.dec;

                const p = await prod(id);

                setQty(
                    p,
                    qtyOf(id) + (d.inc ? 1 : -1)
                );

                render();
                return;
            }

            /* ELIMINAR DEL CARRITO */

            if (d.rm) {
                cart = cart.filter(
                    x =>
                        String(x.productId) !==
                        String(d.rm)
                );

                saveCart();

                render();
                return;
            }

           

           /* ==========================================
   DESPLAZAMIENTO DEL CARRUSEL
========================================== */

else if (d.scroll) {

    const carouselElement = b.closest('[data-carousel]');

    const track = carouselElement?.querySelector('[data-track]');

    if (!track) return;

    const isProductCarousel = Boolean(
        carouselElement.closest('.fm-product-carousel')
    );

    const distance = isProductCarousel
        ? track.clientWidth
        : track.clientWidth * 0.8;

    track.scrollBy({
        left: Number(d.scroll) * distance,
        behavior: 'smooth'
    });

}

            /* BANNER */

            if (d.slide) {
                const h = $('#hero');

                if (h) {
                    h.innerHTML = hero(
                        Number(d.slide)
                    );
                }

                return;
            }

            /* MENÚ */

            if ('menu' in d) {
                const nav = $('#nav');

                if (!nav) return;

                const open = nav.classList.contains(
                    'hidden'
                );

                nav.classList.toggle(
                    'hidden',
                    !open
                );

                nav.classList.toggle(
                    'flex',
                    open
                );

                b.setAttribute(
                    'aria-expanded',
                    String(open)
                );

                return;
            }

            /* VACIAR CARRITO */

            if ('clear' in d) {
                cart = [];

                saveCart();

                render();
                return;
            }

            /* USUARIO DE PRUEBA */

            if ('demo' in d) {
                user = await api(
                    '/auth/demo-login',
                    {
                        method: 'POST'
                    }
                );

                location.hash = '#/cuenta';

                render();
                return;
            }

            /* CERRAR SESIÓN */

            if ('logout' in d) {
                await api(
                    '/auth/logout',
                    {
                        method: 'POST'
                    }
                );

                user = null;

                location.hash = '#/';

                render();
            }

        } catch (err) {
            toast(err.message);
        }
    }
);

/* ==========================================
   NAVEGACIÓN DE FOTOS CON TECLADO
========================================== */

document.addEventListener(
    'keydown',
    e => {
        if (
            ![
                'ArrowLeft',
                'ArrowRight'
            ].includes(e.key)
        ) {
            return;
        }

        const g = e.target.closest?.(
            '.fm-gallery'
        );

        if (!g) return;

        e.preventDefault();

        g.querySelector(
            `[data-pdp-arrow="${
                e.key === 'ArrowLeft' ? -1 : 1
            }"]`
        )?.click();
    }
);

/* ==========================================
   FORMULARIOS
========================================== */

document.addEventListener(
    'submit',
    async e => {
        e.preventDefault();

        const f = e.target;

        /* BUSCADOR */

        if (f.id === 'sf') {
            location.hash =
                '#/catalogo?q=' +
                encodeURIComponent(
                    $('#sq')?.value || ''
                );

            return;
        }

        /* FILTROS */

        if (f.id === 'ff') {
            const p = new URLSearchParams(
                [...new FormData(f)].filter(
                    ([, v]) => v !== ''
                )
            );

            const next =
                '#/catalogo' +
                (p.size ? '?' + p : '');

            if (location.hash === next) {
                render();
            } else {
                location.hash = next;
            }

            return;
        }

        /* LOGIN Y REGISTRO */

        if (
            f.id === 'lf' ||
            f.id === 'rf'
        ) {
            const data = Object.fromEntries(
                new FormData(f)
            );

            const btn = f.querySelector('button');

            btn.disabled = true;

            if ($('#ae')) {
                $('#ae').textContent = '';
            }

            try {
                user = await api(
                    f.id === 'lf'
                        ? '/auth/login'
                        : '/auth/register',

                    {
                        method: 'POST',
                        body: data
                    }
                );

                render();

            } catch (err) {
                if ($('#ae')) {
                    $('#ae').textContent = err.fields
                        ? 'Revisa los datos del formulario.'
                        : err.message;
                }

                btn.disabled = false;
            }

            return;
        }

        /* CONFIRMAR PEDIDO */

        if (f.id === 'co') {
            const v = Object.fromEntries(
                new FormData(f)
            );

            const errors = {};

            if (
                String(v.name || '').trim().length < 3
            ) {
                errors.name =
                    'Escribe tu nombre completo';
            }

            if (
                !/^\S+@\S+\.\S+$/.test(
                    v.email || ''
                )
            ) {
                errors.email = 'Correo no válido';
            }

            for (const key of [
                'calle',
                'numeroExterior',
                'colonia',
                'codigoPostal',
                'ciudad',
                'estado'
            ]) {
                if (!String(v[key] || '').trim()) {
                    errors[key] = 'Campo obligatorio';
                }
            }

            f.querySelectorAll(
                '[data-err]'
            ).forEach(el => {
                el.textContent =
                    errors[el.dataset.err] || '';
            });

            if (Object.keys(errors).length) {
                return;
            }

            const btn = f.querySelector('button');

            btn.disabled = true;
            btn.textContent = 'Creando…';

            try {
                const o = await api('/orders', {
                    method: 'POST',

                    body: {
                        lines: cart,

                        customer: {
                            name: v.name,
                            email: v.email
                        },

                        address: {
                            calle: v.calle,
                            numeroExterior: v.numeroExterior,
                            colonia: v.colonia,
                            codigoPostal: v.codigoPostal,
                            ciudad: v.ciudad,
                            estado: v.estado
                        },

                        delivery: v.delivery,

                        paymentMethod:
                            v.paymentMethod
                    }
                });

                cart = [];
                saveCart();

                app.innerHTML = `

                    <div class="fm-empty">

                        <h1>
                            ¡Pedido de demostración creado!
                        </h1>

                        <p>
                            Folio: ${esc(o.id)}
                        </p>

                        <p>
                            ${esc(o.status)}
                        </p>

                        <p>
                            Total: ${mxn(o.total)}
                        </p>

                        <a
                            class="btn"
                            href="#/pedidos"
                        >
                            Ver mis pedidos
                        </a>

                    </div>
                `;

            } catch (err) {
                if ($('#ce')) {
                    $('#ce').textContent = err.message;
                }

                btn.disabled = false;

                btn.textContent =
                    'Confirmar pedido de demostración';
            }
        }
    }
);

/* ==========================================
   ESTILOS GENERALES
========================================== */

function styles() {
    if (document.getElementById('fm-app-styles')) {
        return;
    }

    const s = document.createElement('style');

    s.id = 'fm-app-styles';

    s.textContent = `

        :root {
            --fm-red: #c8102e;
            --fm-rail: 265px;
            --fm-gap: 28px;
            --fm-pad: 24px;
        }



/* ==========================================
   FERROMAX - CARRUSEL DE MARCAS
========================================== */

#app .fm-brands-home {
    width: 100%;
    padding: 32px 24px 38px;
    margin: 36px 0;
    background: #f5f6f7;
    text-align: center;
}

#app .fm-brands-title {
    margin: 0 auto 26px;
    color: #151b29;
    font-size: clamp(23px, 2.5vw, 32px);
    font-weight: 900;
    line-height: 1.3;
    text-align: center;
}

/* ==========================================
   CARRUSEL DE PRODUCTOS RECIENTES
========================================== */

#app .fm-product-carousel {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
}

/* CONTENEDOR DEL CARRUSEL */

#app .fm-product-carousel .fm-carousel {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

/* CONTENEDOR DE PRODUCTOS */

#app .fm-product-carousel .fm-track {
    display: flex;
    justify-content: safe center;
    align-items: stretch;
    gap: 16px;

    flex: 1;
    min-width: 0;

    overflow-x: auto;
    overflow-y: hidden;

    padding: 12px 2px 18px;

    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;

    scrollbar-width: none;
}

/* OCULTAR BARRA DE DESPLAZAMIENTO */

#app .fm-product-carousel .fm-track::-webkit-scrollbar {
    display: none;
}

/* CUATRO PRODUCTOS COMPLETOS */

#app .fm-product-carousel .fm-track > div {
    flex: 0 0 calc((100% - 48px) / 4) !important;

    width: calc((100% - 48px) / 4);

    min-width: 0;

    display: flex;

    scroll-snap-align: start;
    box-sizing: border-box;
}

/* TARJETAS */

#app .fm-product-carousel .fm-card {
    width: 100%;
    height: 100%;
    min-width: 0;
}

/* FLECHAS DEL CARRUSEL */

#app .fm-product-carousel .fm-carousel > button {
    flex: 0 0 40px;

    width: 40px;
    height: 42px;

    border: 1px solid #e9dfe2;
    border-radius: 10px;

    background: #ffffff;
    color: #c8102e;

    display: grid;
    place-items: center;

    cursor: pointer;
}

#app .fm-product-carousel .fm-carousel > button:hover {
    background: #c8102e;
    border-color: #c8102e;
    color: #ffffff;
}

/* ==========================================
   TABLETS HORIZONTALES
   TRES PRODUCTOS
========================================== */

@media (max-width: 1100px) {

    #app .fm-product-carousel .fm-track > div {
        flex-basis: calc((100% - 32px) / 3) !important;
    }

}

/* ==========================================
   TABLETS
   DOS PRODUCTOS
========================================== */

@media (max-width: 800px) {

    #app .fm-product-carousel .fm-track > div {
        flex-basis: calc((100% - 16px) / 2) !important;
    }

}

/* ==========================================
   CELULARES
   UN PRODUCTO
========================================== */

@media (max-width: 560px) {

    #app .fm-product-carousel .fm-carousel {
        gap: 6px;
    }

    #app .fm-product-carousel .fm-track > div {
        flex-basis: 100% !important;
    }

    #app .fm-product-carousel .fm-carousel > button {
        flex-basis: 32px;

        width: 32px;
        height: 36px;
    }

}
}

#app .fm-brand-track {
    display: flex;
    flex: 1;
    gap: 17px;
    min-width: 0;
    padding: 9px 3px 20px;
    overflow-x: auto;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
}

#app .fm-brand-track::-webkit-scrollbar {
    display: none;
}

#app .fm-brand-slide {
    flex: 0 0 calc((100% - 85px) / 6);
    min-width: 0;
    scroll-snap-align: start;
}

/* TARJETAS DE LOGOTIPOS */

#app .fm-brand-card {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 92px;
    padding: 14px;
    background: #ffffff;
    border: 1px solid #e2e2e2;
    border-radius: 13px;
    box-shadow: 0 7px 14px rgba(0,0,0,.18);
    text-decoration: none;
    overflow: hidden;
    transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
}

#app .fm-brand-card:hover {
    transform: translateY(-5px);
    border-color: #c8102e;
    box-shadow: 0 11px 22px rgba(0,0,0,.20);
}

/* LOGOTIPO */

#app .fm-brand-card img {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: block;
    width: 100%;
    height: 100%;
    padding: 13px;
    background: #fff;
    object-fit: contain;
    object-position: center;
    transform: none;
}

/* NOMBRE ALTERNATIVO SIN IMAGEN */

#app .fm-brand-fallback {
    display: block;
    color: #c8102e;
    font-size: 18px;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
    overflow-wrap: anywhere;
}

/* FLECHAS */

#app .fm-brand-arrow {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    width: 32px;
    height: 44px;
    border: 0;
    border-radius: 8px;
    background: #fff;
    color: #c8102e;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 3px 9px rgba(0,0,0,.08);
}

#app .fm-brand-arrow:hover {
    background: #c8102e;
    color: #fff;
}

#app .fm-brand-arrow[hidden] {
    display: none !important;
}

/* BOTÓN VER TODAS LAS MARCAS */

#app .fm-brands-see-all {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 42px;
    margin-top: 3px;
    padding: 0 26px;
    border-radius: 8px;
    background: #e3292b;
    color: white;
    font-size: 14px;
    font-weight: 800;
    text-decoration: none;
    transition: background .2s ease;
}

#app .fm-brands-see-all:hover {
    background: #bd1028;
}

/* ==========================================
   PÁGINA DE TODAS LAS MARCAS
========================================== */

#app .fm-brands-page {
    width: 100%;
    max-width: 1350px;
    margin: 0 auto;
    padding: 30px 15px 70px;
}

#app .fm-brands-page-header {
    text-align: center;
    margin-bottom: 32px;
}

#app .fm-brands-label {
    color: #c8102e;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 2px;
}

#app .fm-brands-page-header h1 {
    margin: 10px 0;
    color: #171d29;
    font-size: clamp(26px, 3vw, 36px);
    font-weight: 900;
}

#app .fm-brands-page-header p {
    color: #777;
    font-size: 15px;
}

#app .fm-brands-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 22px;
}

#app .fm-brands-grid .fm-brand-card {
    height: 110px;
}

#app .fm-brands-empty {
    padding: 25px;
    text-align: center;
    color: #777;
}

/* ==========================================
   DISEÑO RESPONSIVE
========================================== */

@media (max-width: 1100px) {

    #app .fm-brand-slide {
        flex-basis: calc((100% - 51px) / 4);
    }

    #app .fm-brands-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 700px) {

    #app .fm-brands-home {
        padding: 26px 12px;
    }

    #app .fm-brand-slide {
        flex-basis: calc((100% - 17px) / 2);
    }

    #app .fm-brand-track {
        gap: 17px;
    }

    #app .fm-brand-card {
        height: 85px;
    }

    #app .fm-brand-arrow {
        width: 25px;
    }

    #app .fm-brands-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    #app .fm-brands-grid .fm-brand-card {
        height: 95px;
    }
}


/* ==========================================
   FERROMAX
   GALERÍA FIJA EN DETALLE DEL PRODUCTO
========================================== */

@media (min-width: 1101px) {

    /* CONTENEDOR DE LA FICHA */

    #app.fm-product-page .fm-pdp {
        display: grid;

        grid-template-columns:
            minmax(0, 1.14fr)
            minmax(345px, .86fr);

        align-items: start;

        gap: clamp(26px, 4vw, 65px);
    }

    /* GALERÍA COMPLETA FIJA */

    #app.fm-product-page .fm-gallery {
        position: sticky !important;

        top: 20px;

        align-self: start;

        display: grid;

        grid-template-columns:
            80px
            minmax(0, 1fr);

        gap: 14px;

        width: 100%;

        max-height: calc(100dvh - 40px);

        z-index: 5;
    }

    /* MINIATURAS DE LA IZQUIERDA */

    #app.fm-product-page .fm-thumbs {
        display: flex;

        flex-direction: column;

        gap: 10px;

        align-items: center;

        max-height: calc(100dvh - 40px);

        overflow-y: auto;
        overflow-x: hidden;

        scrollbar-width: thin;

        scrollbar-color:
            #c8102e #f5f1f2;
    }

    /* FOTOGRAFÍAS PEQUEÑAS */

    #app.fm-product-page .fm-thumb {
        width: 78px;
        height: 78px;

        min-height: 78px;
        flex-shrink: 0;
    }

    /* FOTOGRAFÍA PRINCIPAL */

    #app.fm-product-page .fm-photo-main {
        width: 100%;

        height: clamp(
            280px,
            calc(100dvh - 160px),
            545px
        );

        overflow: hidden;

        border-radius: 17px;
    }

    /* IMAGEN DENTRO DEL CONTENEDOR */

    #app.fm-product-page .fm-photo-img {
        width: 100%;
        height: 100%;

        object-fit: contain;
    }

    /* INFORMACIÓN QUE SÍ SE DESPLAZA */

    #app.fm-product-page .fm-product-info {
        min-width: 0;
        align-self: start;
    }
}

/* ==========================================
   TABLET Y CELULARES
========================================== */

@media (max-width: 1100px) {

    #app.fm-product-page .fm-gallery {
        position: static !important;

        top: auto;

        max-height: none;

        z-index: auto;
    }

    #app.fm-product-page .fm-thumbs {
        max-height: none;
        overflow: visible;
    }
}


/* ==========================================
   FERROMAX
   CATEGORÍAS PRINCIPALES - DISEÑO CORREGIDO
========================================== */

/* CONTENEDOR DE CATEGORÍAS */

#app .fm-home-cats {
    display: grid !important;

    grid-template-columns:
        repeat(3, minmax(0, 1fr)) !important;

    gap: 22px !important;

    align-items: stretch;

    width: 100%;

    margin-top: 22px;
}

/* TARJETAS */

#app .fm-home-cats .fm-cat-tile {
    display: grid !important;

    grid-template-rows: 165px auto 1fr;

    min-width: 0;

    min-height: 265px;

    padding: 0 !important;

    overflow: hidden !important;

    background: #ffffff;

    border: 1px solid #e9dfe3;

    border-radius: 15px;

    text-decoration: none;

    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.035);

    transition:
        transform 0.25s ease,
        box-shadow 0.25s ease,
        border-color 0.25s ease;
}

/* EFECTO AL PASAR EL CURSOR */

#app .fm-home-cats .fm-cat-tile:hover {
    transform: translateY(-5px);

    border-color: #c8102e;

    box-shadow:
        0 12px 26px rgba(120, 20, 40, 0.10);
}

/* CONTENEDOR DE LA IMAGEN */

#app .fm-home-cats .fm-cat-tile > div:first-child {
    display: flex !important;

    align-items: center !important;

    justify-content: center !important;

    width: 100% !important;

    height: 165px !important;

    min-height: 0 !important;

    padding: 18px !important;

    margin: 0 !important;

    overflow: hidden !important;

    box-sizing: border-box;

    background: #faf7f8;

    border-bottom: 1px solid #f0e9ec;

    font-size: 43px;
}

/* IMÁGENES DE LAS CATEGORÍAS */

#app .fm-home-cats .fm-cat-tile > div:first-child img {
    display: block !important;

    position: static !important;

    width: 100% !important;

    height: 100% !important;

    max-width: 100% !important;

    max-height: 100% !important;

    margin: 0 auto !important;

    padding: 0 !important;

    object-fit: contain !important;

    object-position: center !important;

    transform: none !important;
}

/* NOMBRE DE LA CATEGORÍA */

#app .fm-home-cats .fm-cat-tile strong {
    display: block;

    width: 100%;

    min-width: 0;

    margin: 0 !important;

    padding: 17px 18px 8px !important;

    color: #252025;

    font-size: 16px !important;

    font-weight: 800;

    line-height: 1.45;

    overflow-wrap: break-word;

    box-sizing: border-box;
}

/* ENLACE VER PRODUCTOS */

#app .fm-home-cats .fm-cat-tile small {
    display: block;

    align-self: end;

    margin: 0 !important;

    padding: 6px 18px 18px !important;

    color: #c8102e;

    font-size: 13px !important;

    font-weight: 700;

    line-height: 1.4;
}

/* EFECTO DEL ENLACE */

#app .fm-home-cats .fm-cat-tile:hover small {
    color: #910a24;
}

/* ==========================================
   RESPONSIVE - TABLETS
========================================== */

@media (max-width: 900px) {

    #app .fm-home-cats {
        grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;

        gap: 18px !important;
    }

}

/* ==========================================
   RESPONSIVE - CELULARES
========================================== */

@media (max-width: 520px) {

    #app .fm-home-cats {
        grid-template-columns:
            1fr !important;

        gap: 16px !important;
    }

    #app .fm-home-cats .fm-cat-tile {
        min-height: 245px;
    }

    #app .fm-home-cats .fm-cat-tile > div:first-child {
        height: 150px !important;
    }

    #app .fm-home-cats .fm-cat-tile {
        grid-template-rows: 150px auto 1fr;
    }

    #app .fm-home-cats .fm-cat-tile strong {
        font-size: 15px !important;
    }

}



        #app * {
            box-sizing: border-box;
        }

        #app.fm-catalog-page,
        #app.fm-product-page {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 30px var(--fm-pad) 80px;
        }

        #app.fm-normal-page {
            max-width: 1180px;
            margin: auto;
            padding: 32px 20px;
        }

        .fm-toast {
            position: fixed;
            bottom: 22px;
            right: 22px;
            z-index: 9999;
            background: #252128;
            color: white;
            padding: 12px 18px;
            border-radius: 10px;
            box-shadow: 0 10px 30px #0003;
        }


/* ==========================================
   BARRA LATERAL FIJA DEL CATÁLOGO
========================================== */

@media (min-width: 960px) {

    #app.fm-catalog-page .fm-catalog-layout #ff {
        position: sticky !important;

        top: 20px;

        align-self: start;

        max-height: calc(100vh - 40px);
        max-height: calc(100dvh - 40px);

        overflow-y: auto;
        overflow-x: hidden;

        overscroll-behavior: contain;

        scrollbar-width: thin;
        scrollbar-color: #c8102e #f5f1f2;

        z-index: 10;
    }

    #app.fm-catalog-page .fm-catalog-layout {
        align-items: start;
    }

    #app.fm-catalog-page .fm-catalog-layout #ff::-webkit-scrollbar {
        width: 6px;
    }

    #app.fm-catalog-page .fm-catalog-layout #ff::-webkit-scrollbar-track {
        background: #f5f1f2;
        border-radius: 10px;
    }

    #app.fm-catalog-page .fm-catalog-layout #ff::-webkit-scrollbar-thumb {
        background: #c8102e;
        border-radius: 10px;
    }
}

/* EN CELULARES NO QUEDA FIJA */

@media (max-width: 959px) {

    #app.fm-catalog-page .fm-catalog-layout #ff {
        position: static !important;

        max-height: none;

        overflow: visible;
    }
}

        /* =================================
           INICIO Y CARRUSELES
        ================================= */

        .fm-home-section {
            max-width: 1180px;
            margin: 36px auto;
            padding: 0 18px;
        }

        .fm-section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
        }

        .fm-section-head h2 {
            font-size: 23px;
            font-weight: 800;
        }

        .fm-section-head a {
            color: var(--fm-red);
            display: flex;
            gap: 4px;
            align-items: center;
            font-weight: 700;
        }

        .fm-home-cats {
            display: grid;
            grid-template-columns: repeat(
                6,
                minmax(0, 1fr)
            );
            gap: 14px;
        }

        .fm-cat-tile {
            border: 1px solid #ebe3e6;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding-bottom: 12px;
            text-decoration: none;
            color: #282328;
        }

        .fm-cat-tile > div {
            height: 115px;
            background: #faf7f8;
            display: grid;
            place-items: center;
            font-size: 38px;
        }

        .fm-cat-tile img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .fm-cat-tile strong,
        .fm-cat-tile small {
            padding: 0 12px;
        }

        .fm-cat-tile strong {
            margin-top: 10px;
            font-size: 13px;
        }

        .fm-cat-tile small {
            color: var(--fm-red);
            margin-top: 4px;
        }

        .fm-carousel {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .fm-carousel > button {
            flex-shrink: 0;
            width: 37px;
            height: 42px;
            border: 1px solid #e9dfe2;
            border-radius: 9px;
            color: var(--fm-red);
            background: white;
            display: grid;
            place-items: center;
        }

        .fm-track {
            display: flex;
            gap: 15px;
            min-width: 0;
            flex: 1;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scrollbar-width: thin;
            padding: 7px 2px 15px;
        }

        .fm-track > div {
            scroll-snap-align: start;
        }

        .fm-brand-tile {
            display: grid;
            place-items: center;
            min-height: 80px;
            border: 1px solid #e8dee2;
            border-radius: 11px;
            text-align: center;
            font-size: 17px;
            font-weight: 800;
            color: #5f555b;
            text-decoration: none;
        }

        .fm-brand-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
        }

        /* =================================
           TARJETAS DE PRODUCTOS
        ================================= */

        .fm-products {
            display: grid;
            grid-template-columns: repeat(
                3,
                minmax(0, 1fr)
            );
            gap: 18px;
        }

        .fm-card {
            display: flex;
            flex-direction: column;
            min-width: 0;
            background: #fcfaf9;
            border: 1px solid #e9e0e4;
            border-radius: 16px;
            padding: 8px;
            transition:
                transform .2s,
                border-color .2s,
                box-shadow .2s;
        }

        .fm-card:hover {
            transform: translateY(-4px);
            border-color: var(--fm-red);
            box-shadow: 0 12px 28px #760d2020;
        }

        .fm-card-media {
            position: relative;
            border-radius: 12px;
            background: #f2eff0;
            overflow: hidden;
        }

        .fm-card-stock {
            position: absolute;
            top: 10px;
            left: 9px;
            z-index: 2;
            padding: 5px 7px;
            border-radius: 5px;
            background: white;
            color: #167044;
            font-weight: 800;
            font-size: 9px;
        }

        .fm-card-stock.off {
            color: var(--fm-red);
        }

        .fm-heart {
            position: absolute;
            z-index: 3;
            top: 8px;
            right: 8px;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 1px solid #ece1e4;
            background: white;
            color: #777;
            font-size: 26px;
            line-height: 1;
            cursor: pointer;
        }

        .fm-heart.is-favorite {
            color: var(--fm-red);
            background: #fff0f3;
        }

        .fm-card-image {
            display: grid;
            place-items: center;
            height: 210px;
            padding: 12px 3px 2px;
            text-decoration: none;
            font-size: 55px;
        }

        .fm-card-image img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            transform: scale(1.10);
        }

        .fm-dots {
            display: flex;
            justify-content: center;
            gap: 8px;
            align-items: center;
            min-height: 28px;
            padding-bottom: 8px;
        }

        .fm-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #bbb1b5;
            border: 0;
            cursor: pointer;
        }

        .fm-dot.active {
            width: 22px;
            border-radius: 7px;
            background: var(--fm-red);
        }

        .fm-card-body {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 8px;
            padding: 10px 8px;
        }

        .fm-card-brand {
            font-size: 11px;
            text-transform: uppercase;
            color: #a31a36;
            font-weight: 800;
        }

        .fm-card-name {
            color: #201a1e;
            font-size: 15px;
            font-weight: 800;
            line-height: 1.35;
            min-height: 40px;
            text-decoration: none;
        }

        .fm-card-name:hover {
            color: var(--fm-red);
        }

        .fm-card-rating {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #777;
            font-size: 11px;
        }

        .fm-stars {
            display: flex;
            gap: 1px;
            color: #cfc6cb;
            font-size: 14px;
        }

        .fm-stars .on {
            color: var(--fm-red);
        }

        .fm-card-price {
            font-size: 21px;
            font-weight: 900;
            color: #1d181c;
        }

        .fm-card-add {
            margin-top: auto;
            width: 100%;
            min-height: 41px;
            border: 0;
            border-radius: 9px;
            background: var(--fm-red);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
        }

        .fm-card-add:disabled {
            background: #aaa;
            cursor: not-allowed;
        }

        /* =================================
           FILTROS DEL CATÁLOGO
        ================================= */

        .fm-catalog-layout {
            display: grid;
            grid-template-columns:
                var(--fm-rail)
                minmax(0, 1fr);
            gap: var(--fm-gap);
            align-items: start;
        }

        .fm-catalog-layout #ff {
            display: flex;
            flex-direction: column;
            gap: 19px;
            min-width: 0;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
        }

        .fm-catalog-layout #ff h2 {
            font-size: 25px;
            font-weight: 850;
            border-bottom: 1px solid #e7dfe2;
            padding-bottom: 14px;
            position: relative;
        }

        .fm-catalog-layout #ff h2::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 50px;
            height: 3px;
            background: var(--fm-red);
        }

        .fm-catalog-layout #ff > label,
        .fm-category-filter {
            display: flex;
            flex-direction: column;
            gap: 9px;
            font-size: 15px;
            font-weight: 700;
            color: #30292e;
        }

        .fm-catalog-layout .field,
        .fm-form .field {
            min-height: 47px;
            width: 100%;
            background: #fff;
            color: #272027;
            border: 1px solid #ded6db;
            border-radius: 9px;
            padding: 10px 12px;
            font-size: 14px;
            outline: none;
        }

        .fm-catalog-layout .field:focus,
        .fm-form .field:focus {
            border-color: var(--fm-red);
            box-shadow: 0 0 0 3px #c8102e1c;
        }

        .fm-catalog-layout #ff > .btn {
            min-height: 45px;
            background: var(--fm-red);
            color: white;
            border: 0;
            border-radius: 9px;
            font-weight: 800;
            font-size: 13px;
        }

        .fm-catalog-layout #ff > a {
            text-align: center;
            color: #7b6b73;
            font-size: 14px;
        }

        .fm-catalog-results {
            min-width: 0;
        }

        .fm-catalog-results h1 {
            font-size: 27px;
            font-weight: 850;
            margin: 0 0 5px;
        }

        .fm-catalog-results > p {
            margin-bottom: 17px;
            color: #786f74;
            font-size: 14px;
        }

        /* =================================
           MENÚ DE CATEGORÍAS
        ================================= */

        .fm-category-menu {
            border: 1px solid #e7dce0;
            border-radius: 11px;
            overflow: hidden;
            background: white;
        }

        .fm-category-title {
            display: flex;
            align-items: center;
            gap: 9px;
            min-height: 66px;
            cursor: pointer;
            background: #faf2f4;
            padding: 10px;
            list-style: none;
        }

        .fm-category-title::-webkit-details-marker {
            display: none;
        }

        .fm-category-title > span:nth-child(2) {
            flex: 1;
            font-size: 13px;
            font-weight: 800;
        }

        .fm-category-title small {
            display: block;
            font-size: 11px;
            color: #82777d;
            font-weight: 500;
            margin-top: 3px;
        }

        .fm-menu-icon {
            width: 35px;
            height: 35px;
            background: var(--fm-red);
            border-radius: 8px;
            color: white;
            display: grid;
            place-items: center;
        }

        .fm-category-list {
            display: flex;
            flex-direction: column;
            gap: 3px;
            max-height: 430px;
            overflow-y: auto;
            padding: 9px 7px;
        }

        .fm-cat-option {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
            text-align: left;
            min-height: 42px;
            width: 100%;
            padding: 8px 10px;
            background: transparent;
            border: 0;
            border-radius: 8px;
            color: #51494f;
            cursor: pointer;
            font-size: 13px;
        }

        .fm-cat-option:hover {
            background: #fff0f3;
            color: var(--fm-red);
        }

        .fm-cat-option.active {
            background: var(--fm-red);
            color: white;
        }

        .fm-cat-option span {
            flex: 1;
        }

        .fm-cat-option em {
            font-style: normal;
            font-size: 11px;
            font-weight: 800;
            background: #f0e9eb;
            color: #776e74;
            border-radius: 5px;
            min-width: 25px;
            padding: 3px 5px;
            text-align: center;
        }

        .fm-cat-option.active em {
            background: #ffffff36;
            color: white;
        }

        .fm-cat-submenu {
            margin-left: 12px;
            border-left: 1px solid #e9dce0;
        }

        .fm-cat-submenu summary {
            font-size: 12px;
            color: #a71b38;
            padding: 8px;
            cursor: pointer;
        }

        .fm-cat-submenu > div {
            padding-left: 8px;
        }

        /* =================================
           FICHA DEL PRODUCTO
        ================================= */

        .fm-pdp {
            display: grid;
            grid-template-columns:
                minmax(0, 1.14fr)
                minmax(345px, .86fr);
            gap: clamp(26px, 4vw, 65px);
            width: 100%;
            max-width: 1450px;
            margin: auto;
            align-items: start;
        }

        .fm-gallery {
            display: grid;
            grid-template-columns:
                80px
                minmax(0, 1fr);
            gap: 14px;
            min-width: 0;
        }

        .fm-thumbs {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .fm-thumb {
            width: 78px;
            height: 78px;
            display: grid;
            place-items: center;
            background: white;
            border: 1px solid #e3dade;
            border-radius: 10px;
            padding: 5px;
            cursor: pointer;
        }

        .fm-thumb.active {
            border: 2px solid var(--fm-red);
            box-shadow: 0 0 0 3px #c8102e15;
        }

        .fm-thumb img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .fm-photo-wrap {
            min-width: 0;
        }

        .fm-photo-main {
            display: grid;
            place-items: center;
            position: relative;
            width: 100%;
            height: clamp(390px, 41vw, 545px);
            background: #f8f6f7;
            border: 1px solid #ece4e7;
            border-radius: 17px;
            overflow: hidden;
            padding: 0;
            cursor: zoom-in;
        }

        .fm-photo-main.zoomed {
            cursor: crosshair;
            touch-action: none;
        }

        .fm-photo-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
        }

        .fm-lens {
            position: absolute;
            z-index: 3;
            top: 50%;
            left: 50%;
            width: 165px;
            height: 165px;
            opacity: 0;
            pointer-events: none;
            transform: translate(-50%, -50%);
            background: #f8f6f7 no-repeat;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 7px 25px #0004;
        }

        .fm-zoom-label {
            position: absolute;
            bottom: 13px;
            right: 13px;
            z-index: 2;
            background: #fffffff2;
            padding: 8px 11px;
            border: 1px solid #eee5e8;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 750;
            color: #3c3338;
            pointer-events: none;
        }

        .fm-photo-nav {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 10px;
        }

        .fm-photo-nav button {
            display: grid;
            place-items: center;
            width: 34px;
            height: 34px;
            background: white;
            color: var(--fm-red);
            border: 1px solid #e5d7dd;
            border-radius: 8px;
            cursor: pointer;
            font-size: 28px;
        }

        .fm-photo-count {
            font-size: 12px;
            color: #7c7379;
        }

        .fm-photo-help {
            text-align: center;
            margin: 10px 0 0;
            font-size: 12px;
            line-height: 1.5;
            color: #81777d;
        }

        /* =================================
           INFORMACIÓN DEL PRODUCTO
        ================================= */

        .fm-product-info {
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        .fm-back {
            margin-bottom: 22px;
            align-self: flex-start;
            color: #746971;
            text-decoration: none;
            font-size: 13px;
        }

        .fm-brand {
            font-size: 12px;
            color: #a11936;
            font-weight: 850;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .fm-product-info h1 {
            font-size: clamp(26px, 2.5vw, 35px);
            font-weight: 850;
            line-height: 1.2;
            margin: 8px 0;
        }

        .fm-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 12px;
            color: #797078;
            margin: 8px 0 22px;
        }

        .fm-price-block {
            border-top: 1px solid #e9dfe3;
            padding-top: 20px;
        }

        .fm-price-block small {
            font-size: 11px;
            color: #7d737a;
            font-weight: 800;
            letter-spacing: .8px;
        }

        .fm-price-block > div {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .fm-price-block strong {
            font-size: clamp(30px, 3vw, 40px);
            font-weight: 900;
        }

        .fm-price-block span {
            color: #a31634;
            background: #fce8ed;
            padding: 6px 10px;
            border-radius: 8px;
            font-weight: 800;
        }

        .fm-price-block del {
            color: #958c91;
            font-size: 13px;
        }

        .fm-stock {
            align-self: flex-start;
            margin: 18px 0 7px;
            padding: 8px 11px;
            color: #237446;
            background: #eef7f0;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 800;
        }

        .fm-stock.out {
            color: var(--fm-red);
            background: #fbe9ed;
        }

        /* =================================
           DESCRIPCIÓN MÁS GRANDE
        ================================= */

        .fm-description {
            margin-top: 21px;
        }

        .fm-description h2 {
            font-size: 17px;
            font-weight: 800;
            margin-bottom: 10px;
        }

        .fm-description p {
            font-size: 16px !important;
            line-height: 1.85 !important;
            color: #484148;
            white-space: pre-line;
            margin: 0;
        }

        /* =================================
           ESPECIFICACIONES TÉCNICAS
        ================================= */

        .fm-spec {
            margin-top: 28px;
            border: 1px solid #efd3db;
            border-radius: 11px;
            overflow: hidden;
        }

        .fm-spec > h2 {
            background: var(--fm-red);
            color: #fff;
            margin: 0;
            padding: 14px 16px;
            font-size: 16px;
            font-weight: 850;
        }

        .fm-spec-row {
            display: grid;
            grid-template-columns:
                minmax(0, 1fr)
                minmax(0, 1fr);
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            font-size: 14px;
            border-bottom: 1px solid #f2dce2;
        }

        .fm-spec-row:nth-child(odd) {
            background: #fff3f5;
        }

        .fm-spec-row strong {
            text-align: right;
            overflow-wrap: anywhere;
            color: #252026;
            font-size: 14px;
        }

        .fm-spec-empty {
            padding: 15px;
            color: #776c73;
            font-size: 14px;
            margin: 0;
        }

        .fm-spec-extra summary {
            background: #fff0f3;
            color: var(--fm-red);
            padding: 12px;
            text-align: center;
            cursor: pointer;
            font-size: 13px;
            font-weight: 800;
        }

        .fm-unit {
            margin-top: 20px;
            font-size: 14px;
            color: #6f666c;
        }

        /* =================================
           COMPRA
        ================================= */

        .fm-purchase {
            display: flex;
            flex-wrap: wrap;
            align-items: end;
            gap: 12px;
            margin-top: 26px;
        }

        .fm-purchase label {
            display: flex;
            flex-direction: column;
            gap: 7px;
            font-size: 13px;
            font-weight: 750;
        }

        .fm-purchase input {
            width: 88px;
            height: 47px;
            border: 1px solid #ded6db;
            border-radius: 9px;
            padding: 9px 11px;
        }

        .fm-buy {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex: 1;
            min-width: 180px;
            min-height: 47px;
            padding: 9px 14px;
            background: var(--fm-red);
            color: #fff;
            border: 0;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
        }

        .fm-view-cart {
            display: grid;
            place-items: center;
            min-height: 47px;
            padding: 8px 13px;
            color: var(--fm-red);
            border: 1px solid var(--fm-red);
            border-radius: 9px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 800;
        }

        .fm-demo-note {
            margin-top: 16px;
            color: #958990;
            font-size: 11px;
        }

        /* =================================
           OTRAS PÁGINAS
        ================================= */

        .fm-empty {
            padding: 70px 16px;
            text-align: center;
        }

        .fm-empty h1 {
            font-size: 23px;
            font-weight: 850;
            margin-bottom: 15px;
        }

        .fm-page-title {
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 20px;
        }

        .fm-cart-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 0;
            border-bottom: 1px solid #eee;
        }

        .fm-cart-row > span:first-child {
            flex: 1;
            min-width: 180px;
        }

        .fm-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 18px;
        }

        .fm-form {
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-width: 500px;
            margin: 0 auto;
        }

        .fm-form h1 {
            font-size: 25px;
            font-weight: 800;
        }

        .fm-form label {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 14px;
            font-weight: 700;
        }

        .fm-error {
            color: #b71939;
            font-size: 13px;
        }

        .fm-account {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            max-width: 850px;
            margin: auto;
        }

        .fm-auth-actions {
            display: flex;
            align-items: center;
            flex-direction: column;
            gap: 12px;
            margin-top: 20px;
        }

        .fm-order {
            border: 1px solid #eee;
            border-radius: 10px;
            margin: 12px 0;
            padding: 16px;
        }

        /* =================================
           ENCABEZADO Y ALINEACIÓN
        ================================= */

        @media (min-width: 960px) {

            #app.fm-catalog-page .fm-catalog-layout {
                grid-template-columns:
                    var(--fm-rail)
                    minmax(0, 1fr);
            }

            #hdr > header,
            #hdr > div:last-child,
            #hdr > div:first-child > div {
                width: 100% !important;
                max-width: none !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                padding-left: var(--fm-pad) !important;
                padding-right: var(--fm-pad) !important;
            }

            #hdr > header {
                display: grid !important;
                grid-template-columns:
                    var(--fm-rail)
                    minmax(200px, 1fr)
                    max-content
                    max-content;

                column-gap: var(--fm-gap) !important;
                row-gap: 14px !important;
                align-items: center;
            }

            #hdr > header > a:first-child {
                width: 100% !important;
                max-width: 100% !important;
                grid-column: 1;
            }

            #hdr > header > #sf {
                grid-column: 2;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0;
            }

            #hdr > div:last-child {
                display: grid !important;
                grid-template-columns:
                    var(--fm-rail)
                    minmax(0, 1fr);

                gap: var(--fm-gap) !important;
                align-items: center;
            }

            #hdr #cat-dd,
            #hdr #nav {
                width: 100%;
                min-width: 0;
            }
        }

        /* =================================
           RESPONSIVE
        ================================= */

        @media (min-width: 1500px) {
            .fm-products {
                grid-template-columns: repeat(
                    4,
                    minmax(0, 1fr)
                );
            }
        }

        @media (max-width: 1100px) {

            .fm-pdp {
                grid-template-columns: minmax(0, 1fr);
            }

            .fm-photo-main {
                height: 480px;
            }

            .fm-home-cats {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 959px) {

            :root {
                --fm-pad: 16px;
            }

            #app .fm-catalog-layout {
                grid-template-columns: minmax(0, 1fr);
            }

            .fm-products {
                grid-template-columns: repeat(
                    2,
                    minmax(0, 1fr)
                );
            }
        }

        @media (max-width: 650px) {

            .fm-gallery {
                display: flex;
                flex-direction: column-reverse;
            }

            .fm-thumbs {
                flex-direction: row;
                flex-wrap: wrap;
            }

            .fm-thumb {
                height: 60px;
                width: 60px;
            }

            .fm-photo-main {
                height: clamp(310px, 80vw, 440px);
            }

            .fm-lens {
                width: 130px;
                height: 130px;
            }

            .fm-home-cats {
                grid-template-columns: repeat(2, 1fr);
            }

            .fm-account {
                grid-template-columns: 1fr;
            }

            .fm-brand-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .fm-pdp {
                gap: 26px;
            }

            .fm-products {
                gap: 11px;
            }

            .fm-card-image {
                height: 155px;
            }

            .fm-card-name {
                font-size: 13px;
            }

            .fm-card-price {
                font-size: 17px;
            }

            .fm-spec-row {
                font-size: 13px;
                padding: 11px;
            }

            .fm-spec-row strong {
                font-size: 13px;
            }
        }

        @media (prefers-reduced-motion: reduce) {

            .fm-card,
            .fm-dot,
            .fm-thumb {
                transition: none;
            }
        }

    `;

    document.head.append(s);
}

/* ==========================================
   INICIALIZACIÓN
========================================== */

styles();

window.addEventListener(
    'hashchange',
    render
);

$('#hdr').innerHTML = header();

$('#ftr').innerHTML = footer();

api('/categories')
    .then(categories => {
        for (const [selector, items] of [
            ['#fcat', categories.slice(0, 6)],
            ['#hcat', categories]
        ]) {
            const e = $(selector);

            if (e) {
                e.innerHTML = items.map(c => `
                    <li>
                        <a
                            href="#/catalogo?categoryId=${
                                encodeURIComponent(c.id)
                            }"
                        >
                            ${esc(c.name)}
                        </a>
                    </li>
                `).join('') || e.innerHTML;
            }
        }
    })
    .catch(() => {});

saveCart();

api('/auth/me')
    .then(u => {
        user = u;
    })
    .catch(() => {})
    .finally(render);
