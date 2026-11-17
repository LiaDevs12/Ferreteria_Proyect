
/* ==========================================
   FERROMAX - VISTA DEL CARRITO
========================================== */

import {
    api,
    cart,
    setCart,
    saveCart,
    esc,
    mxn,
    imageUrl,
    validImage
} from './core.js';


/* ==========================================
   ICONOS
========================================== */

const ICONO_BOLSA = `
    <svg viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="1.6"
         stroke-linecap="round"
         stroke-linejoin="round"
         aria-hidden="true">
        <path d="M4 8h16l-1 13H5L4 8z"/>
        <path d="M9 9V6a3 3 0 0 1 6 0v3"/>
    </svg>
`;

const ICONO_BASURA = `
    <svg viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="1.8"
         stroke-linecap="round"
         stroke-linejoin="round"
         aria-hidden="true">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M6 6l1 15h10l1-15"/>
        <path d="M10 10v7M14 10v7"/>
    </svg>
`;

const ICONO_PAQUETE = `
    <svg viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="1.5"
         stroke-linecap="round"
         stroke-linejoin="round"
         aria-hidden="true">
        <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/>
        <path d="M3 7l9 4 9-4"/>
        <path d="M12 11v10"/>
    </svg>
`;


/* ==========================================
   CARRITO VACÍO
========================================== */

function carritoVacio() {

    return `
        <section class="fm-cart-page">

            <div class="fm-cart-header">
                <span>FERROMAX · MI COMPRA</span>

                <h1>Mi carrito</h1>

                <p>
                    Revisa y administra los productos
                    que deseas comprar.
                </p>
            </div>

            <div class="fm-cart-empty">

                <div class="fm-cart-empty-icon">
                    ${ICONO_BOLSA}
                </div>

                <h2>Tu carrito está vacío</h2>

                <p>
                    Todavía no has agregado productos.
                    Explora nuestro catálogo y encuentra
                    las herramientas y materiales
                    que necesitas.
                </p>

                <a href="#/catalogo"
                   class="fm-cart-primary">
                    Explorar productos
                    <span aria-hidden="true">→</span>
                </a>

            </div>

        </section>
    `;
}


/* ==========================================
   OBTENER FOTOGRAFÍA
========================================== */

function fotoProducto(producto) {

    if (!producto) return '';

    const opciones = [
        producto.image,
        producto.imagen,

        ...(Array.isArray(producto.images)
            ? producto.images
            : []),

        ...(Array.isArray(producto.imagenes)
            ? producto.imagenes
            : [])
    ];

    return opciones
        .map(imageUrl)
        .find(validImage) || '';
}


/* ==========================================
   TARJETA DE PRODUCTO
========================================== */

function tarjetaCarrito(item, producto) {

    const id = String(item.productId);

    const nombre = String(
        item.name ||
        producto?.name ||
        'Producto'
    );

    const imagen = fotoProducto(producto);

    const marca = String(
        producto?.brand?.nombre ||
        producto?.brand ||
        producto?.marca?.nombre ||
        producto?.marca ||
        ''
    );

    const sku = String(
        producto?.sku || ''
    );

    const cantidad = Number(item.quantity) || 0;

    return `

        <article class="fm-cart-product">

            <!-- FOTOGRAFÍA -->

            <a
                href="#/producto/${encodeURIComponent(id)}"
                class="fm-cart-product-image"
                aria-label="Ver ${esc(nombre)}"
            >

                <span class="fm-cart-image-fallback">
                    ${ICONO_PAQUETE}
                </span>

                ${imagen ? `
                    <img
                        src="${esc(imagen)}"
                        alt="${esc(nombre)}"
                        loading="lazy"
                        onerror="this.remove()"
                    >
                ` : ''}

            </a>

            <!-- INFORMACIÓN -->

            <div class="fm-cart-product-info">

                ${marca ? `
                    <span class="fm-cart-brand">
                        ${esc(marca)}
                    </span>
                ` : ''}

                <a
                    href="#/producto/${encodeURIComponent(id)}"
                    class="fm-cart-product-name"
                >
                    ${esc(nombre)}
                </a>

                ${sku ? `
                    <span class="fm-cart-sku">
                        SKU: ${esc(sku)}
                    </span>
                ` : ''}

                <div class="fm-cart-unit-price">
                    Precio unitario:
                    <strong>${mxn(item.unitPrice)}</strong>
                </div>

                <div class="fm-cart-product-bottom">

                    <!-- CANTIDAD -->

                    <div class="fm-cart-quantity">

                        <span>Cantidad</span>

                        <div class="fm-cart-quantity-controls">

                            <button
                                type="button"
                                data-dec="${esc(id)}"
                                aria-label="Disminuir cantidad de ${esc(nombre)}"
                            >
                                −
                            </button>

                            <strong>
                                ${esc(cantidad)}
                            </strong>

                            <button
                                type="button"
                                data-inc="${esc(id)}"
                                aria-label="Aumentar cantidad de ${esc(nombre)}"
                            >
                                +
                            </button>

                        </div>

                    </div>

                    <!-- SUBTOTAL DEL PRODUCTO -->

                    <div class="fm-cart-line-total">

                        <span>Subtotal</span>

                        <strong>
                            ${mxn(item.subtotal)}
                        </strong>

                    </div>

                </div>

                <!-- ELIMINAR -->

                <button
                    type="button"
                    class="fm-cart-remove"
                    data-rm="${esc(id)}"
                >
                    ${ICONO_BASURA}
                    Eliminar producto
                </button>

            </div>

        </article>
    `;
}


/* ==========================================
   VISTA PRINCIPAL
========================================== */

export async function vistaCarrito() {

    if (!cart.length) {
        return carritoVacio();
    }

    /*
       Consultar precios actuales del servidor.
       Consultar productos para obtener fotografías.
    */

    const [precios, respuestaProductos] =
        await Promise.all([

            api('/pricing', {
                method: 'POST',
                body: { lines: cart }
            }),

            api('/products').catch(() => [])

        ]);

    if (!precios.items?.length) {

        setCart([]);
        saveCart();

        return carritoVacio();
    }

    const productos = Array.isArray(respuestaProductos)
        ? respuestaProductos
        : Array.isArray(respuestaProductos?.products)
            ? respuestaProductos.products
            : [];

    const indiceProductos = new Map(
        productos.map(producto => [
            String(producto.id ?? producto.id_producto),
            producto
        ])
    );

    const cantidadTotal = precios.items.reduce(
        (total, item) =>
            total + (Number(item.quantity) || 0),
        0
    );

    return `

        <section class="fm-cart-page">

            <!-- ENCABEZADO -->

            <div class="fm-cart-header">

                <span>
                    FERROMAX · MI COMPRA
                </span>

                <h1>Mi carrito</h1>

                <p>
                    Revisa tus productos y modifica
                    las cantidades antes de continuar
                    con tu compra.
                </p>

            </div>


            <div class="fm-cart-layout">

                <!-- COLUMNA DE PRODUCTOS -->

                <div class="fm-cart-left">

                    <div class="fm-cart-list-header">

                        <h2>
                            Productos seleccionados
                        </h2>

                        <span>
                            ${cantidadTotal}
                            ${cantidadTotal === 1
                                ? 'artículo'
                                : 'artículos'}
                        </span>

                    </div>

                    <div class="fm-cart-products">

                        ${precios.items.map(item =>
                            tarjetaCarrito(
                                item,
                                indiceProductos.get(
                                    String(item.productId)
                                )
                            )
                        ).join('')}

                    </div>

                    <div class="fm-cart-list-actions">

                        <a
                            href="#/catalogo"
                            class="fm-cart-continue"
                        >
                            ← Seguir comprando
                        </a>

                        <button
                            type="button"
                            class="fm-cart-clear"
                            data-clear
                        >
                            ${ICONO_BASURA}
                            Vaciar carrito
                        </button>

                    </div>

                </div>


                <!-- RESUMEN DE COMPRA -->

                <aside class="fm-cart-summary">

                    <div class="fm-cart-summary-heading">

                        <span>RESUMEN DE COMPRA</span>

                        <h2>Tu pedido</h2>

                        <p>
                            Resumen de los productos
                            seleccionados.
                        </p>

                    </div>

                    <div class="fm-cart-summary-details">

                        <div class="fm-cart-summary-row">

                            <span>
                                Productos (${cantidadTotal})
                            </span>

                            <strong>
                                ${mxn(precios.subtotal)}
                            </strong>

                        </div>

                        <div class="fm-cart-summary-row">

                            <span>Envío</span>

                            <strong>
                                ${mxn(precios.shipping)}
                            </strong>

                        </div>

                    </div>

                    <div class="fm-cart-summary-total">

                        <div>
                            <span>Total</span>
                            <small>Importe del pedido</small>
                        </div>

                        <strong>
                            ${mxn(precios.total)}
                        </strong>

                    </div>

                    <a
                        href="#/checkout"
                        class="fm-cart-primary"
                    >
                        Continuar con mi compra
                        <span aria-hidden="true">→</span>
                    </a>

                    <p class="fm-cart-summary-note">
                        Verifica los productos y las
                        cantidades antes de confirmar
                        tu pedido.
                    </p>

                </aside>

            </div>

        </section>
    `;
}
