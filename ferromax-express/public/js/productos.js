import { ic, emo } from '/ui.js';
import { esc, mxn, imageUrl, validImage, favorites, qtyOf } from './core.js';

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

export function card(p) {
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

export const grid = arr => `
    <div class="fm-products">
        ${arr.map(card).join('')}
    </div>
`;
/* ==========================================
   FICHA DE PRODUCTO
========================================== */

export function productPage(p) {
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
   CAMBIAR FOTOGRAFÍA PRINCIPAL
========================================== */

export function changeMainPhoto(galleryEl, index) {
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

export function updateMagnifier(main, clientX, clientY) {
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
