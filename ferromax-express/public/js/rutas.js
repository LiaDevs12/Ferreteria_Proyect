
import { hero, benefits, infoStrip } from '/ui.js';

import {
    app, api, prod, esc, mxn, norm,
    user, cart, categoryScroll
} from './core.js';

import { card, grid, productPage } from './productos.js';
import {
    vistaCheckout,
    activarCheckout,
    mostrarPagoStripe
} from './checkout.js';
import {
    head,
    carousel,
    empty,
    catTile,
    categoryFromURL,
    subcategoryIds,
    categoryMenu
} from './catalogo.js';

import { tarjetaMarca } from './marcas.js';

import { initGoogle } from './google.js';

import { vistaCuenta } from './acceso.js';

import { vistaNosotros } from './nosotros.js';

import { vistaContacto } from './contacto.js';

import { vistaPanelCliente } from './perfil-cliente.js';

import { vistaCarrito } from './carrito.js';


/* ==========================================
   FERROMAX - RUTAS DE LA TIENDA
========================================== */

export const routes = {

    /* ======================================
       INICIO
    ====================================== */

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


            <!-- CATEGORÍAS PRINCIPALES -->

            <section class="fm-home-section">

                ${head('Categorías principales')}

                <div class="fm-category-banners">

                    ${categories.slice(0, 6).map(
                        category => catTile(
                            category,
                            products,
                            categories
                        )
                    ).join('')}

                </div>

            </section>


            <!-- BANNER INTERMEDIO -->

            <section class="fm-home-banner">

                <img
                    src="/img/footer2.png"
                    alt="Herramientas y productos para el hogar"
                    class="fm-home-banner-img"
                    loading="lazy"
                >

                <div class="fm-home-banner-overlay"></div>

                <div class="fm-home-banner-content">

                    <h2>
                        Compra

                        <strong>
                            los mejores productos de
                            ferretería y del hogar
                        </strong>
                    </h2>

                </div>

            </section>


            <!-- PRODUCTOS RECIENTES -->

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


            <!-- MARCAS -->

            <section class="fm-home-section">

                ${head(
                    'Marcas que manejamos',
                    '#/marcas',
                    'Ver todas'
                )}

                ${brands.length

                    ? carousel(
                        brands.map(
                            marca => tarjetaMarca(marca)
                        ),
                        '180px'
                    )

                    : '<p>No hay marcas registradas.</p>'
                }

            </section>


            ${infoStrip()}

        `;
    },


    /* ======================================
       MARCAS
    ====================================== */

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
                        las herramientas y productos
                        que necesitas.
                    </p>

                </div>

                ${brands.length ? `

                    <div class="fm-brands-grid">

                        ${brands.map(
                            marca => tarjetaMarca(marca)
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


    /* ======================================
       CATÁLOGO DE PRODUCTOS
    ====================================== */

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


        /* FILTRAR PRODUCTOS */

        const products = all.filter(p => {

            const categoryMatch =
                !cat.requested ||
                (
                    cat.exists &&
                    descendants.has(
                        String(p.categoryId)
                    )
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


        /* ORDENAMIENTO */

        if (g('sort') === 'precio-asc') {

            products.sort(
                (a, b) =>
                    Number(a.price) - Number(b.price)
            );

        } else if (g('sort') === 'precio-desc') {

            products.sort(
                (a, b) =>
                    Number(b.price) - Number(a.price)
            );

        } else if (g('sort') === 'nombre') {

            products.sort(
                (a, b) =>
                    String(a.name).localeCompare(
                        String(b.name),
                        'es-MX'
                    )
            );

        }


        /* SELECTORES */

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


        /* CONTENIDO */

        app.innerHTML = `

            <!-- TÍTULO DEL CATÁLOGO -->

            <header class="fm-editorial-page-header">

                <span class="fm-editorial-eyebrow">
                    FERROMAX · CATÁLOGO
                </span>

                <h1>
                    ${esc(
                        cat.requested
                            ? cat.name
                            : 'Todos los productos'
                    )}
                </h1>

                <p>
                    Explora nuestra selección de herramientas,
                    materiales y accesorios para tus proyectos
                    de construcción, mantenimiento y hogar.
                </p>

            </header>


            <!-- DISTRIBUCIÓN DEL CATÁLOGO -->

            <div class="fm-catalog-layout">


                <!-- BARRA DE FILTROS -->

                <form
                    id="ff"
                    aria-label="Filtros"
                >

                    <h2>
                        Filtros
                    </h2>


                    <!-- BUSCAR -->

                    <label>
                        Buscar

                        <input
                            name="q"
                            class="field"
                            value="${esc(g('q'))}"
                            placeholder="Nombre, marca o SKU"
                        >
                    </label>


                    <!-- CATEGORÍAS -->

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


                    <!-- MARCAS -->

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


                    <!-- PRECIO MÁXIMO -->

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


                    <!-- ORDENAR -->

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


                    <!-- APLICAR FILTROS -->

                    <button
                        type="submit"
                        class="btn"
                    >
                        Aplicar filtros
                    </button>


                    <!-- LIMPIAR -->

                    <a href="#/catalogo">
                        Limpiar filtros
                    </a>

                </form>


                <!-- RESULTADOS -->

                <section class="fm-catalog-results">

                    <div class="fm-catalog-counter">
                        ${products.length} resultado(s)
                    </div>

                    ${!cat.exists ? `

                        <p>
                            Categoría no registrada:
                            ${esc(cat.name)}
                        </p>

                    ` : products.length

                        ? grid(products)

                        : `

                            <p>
                                No hay productos que
                                coincidan con los filtros.
                            </p>

                        `
                    }

                </section>

            </div>

        `;


        /* CONSERVAR POSICIÓN DEL MENÚ */

        const menu = app.querySelector(
            '.fm-category-list'
        );

        if (menu) {
            menu.scrollTop = categoryScroll;
        }

    },


    /* ======================================
       DETALLE DEL PRODUCTO
    ====================================== */

    async producto([id]) {

        const p = await prod(id).catch(
            () => null
        );

        app.innerHTML = p
            ? productPage(p)
            : empty('Producto no encontrado');

    },


    /* ======================================
       MI CARRITO
       DISEÑO NUEVO
    ====================================== */

    async carrito() {

        app.innerHTML = await vistaCarrito();

    },


    /* CHECKOUT */

    async checkout() {
        if (!cart.length) {
            app.innerHTML = empty(
                'Tu carrito está vacío',
                '#/catalogo',
                'Explorar productos'
            );
            return;
        }

        if (!user) {
            app.innerHTML = empty(
                'Inicia sesión para continuar con tu compra',
                '#/cuenta',
                'Iniciar sesión'
            );
            return;
        }

        app.innerHTML = await vistaCheckout();
        activarCheckout();
    },


    /* ======================================
       PEDIDOS
    ====================================== */

    async pago([id]) {
        if (!user) {
            app.innerHTML = empty(
                'Inicia sesión para consultar tu pago',
                '#/cuenta',
                'Iniciar sesión'
            );
            return;
        }

        await mostrarPagoStripe(id);
    },


    /* ======================================
       CUENTA DEL CLIENTE
    ====================================== */

    async cuenta(_, qs) {

        if (user) {

            const pestaña =
                qs?.get('tab') || 'perfil';

            app.innerHTML =
                await vistaPanelCliente(pestaña);

            return;
        }

        const cfg = await api('/config');

        app.innerHTML = vistaCuenta(
            null,
            cfg.googleClientId
        );

        if (cfg.googleClientId) {
            initGoogle(cfg.googleClientId);
        }

    },


    /* ======================================
       NOSOTROS, CONTACTO Y OTRAS PÁGINAS
    ====================================== */

    async info([slug]) {

        /* NOSOTROS */

        if (slug === 'nosotros') {

            app.innerHTML = vistaNosotros();

            return;
        }


        /* CONTACTO */

        if (slug === 'contacto') {

            app.innerHTML = vistaContacto();

            return;
        }


        /* OTRAS PÁGINAS */

        const names = {
            faq: 'Preguntas frecuentes',
            privacidad: 'Política de privacidad',
            terminos: 'Términos y condiciones',
            envios: 'Envíos y devoluciones'
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
