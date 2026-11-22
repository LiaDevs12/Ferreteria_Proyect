
import { hero, slides } from '/ui.js';

import {
    $,
    app,
    api,
    prod,
    esc,
    mxn,
    toast,
    cart,
    saveCart,
    setCart,
    setUser,
    setCategoryScroll,
    qtyOf,
    setQty,
    toggleFavorite
} from './core.js';

import {
    changeMainPhoto,
    updateMagnifier
} from './productos.js';

import { render } from './navegacion.js';

import {
    actualizarBotonCheckout,
    recordarCarritoStripe
} from './checkout.js';


/* ==========================================
   BANNER PRINCIPAL
========================================== */

const TIEMPO_BANNER = 7000;

let intervaloBanner = null;
let indiceBanner = 0;

function pintarBanner(indice) {

    const contenedor = $('#hero');

    if (!contenedor || !slides?.length) {
        return;
    }

    indiceBanner = (
        (indice % slides.length) + slides.length
    ) % slides.length;

    const temporal = document.createElement('div');

    temporal.innerHTML = hero(indiceBanner);

    const textoActual = contenedor.querySelector(
        '.fm-main-hero-copy'
    );

    const textoNuevo = temporal.querySelector(
        '.fm-main-hero-copy'
    );

    if (textoActual && textoNuevo) {

        textoActual.innerHTML = textoNuevo.innerHTML;

        contenedor.querySelectorAll(
            '[data-slide]'
        ).forEach(boton => {

            const activo =
                Number(boton.dataset.slide) === indiceBanner;

            boton.classList.toggle('active', activo);

            boton.setAttribute(
                'aria-current',
                String(activo)
            );

            boton.setAttribute(
                'aria-pressed',
                String(activo)
            );
        });

    } else {

        contenedor.innerHTML =
            temporal.innerHTML;
    }
}

function iniciarBannerAutomatico() {

    if (intervaloBanner !== null) {
        clearInterval(intervaloBanner);
    }

    intervaloBanner = setInterval(() => {

        if (
            !document.hidden &&
            $('#hero')
        ) {
            pintarBanner(indiceBanner + 1);
        }

    }, TIEMPO_BANNER);
}

iniciarBannerAutomatico();


/* ==========================================
   CERRAR SESIÓN
========================================== */

let cerrandoSesion = false;

document.addEventListener(
    'click',
    async event => {

        const elemento =
            event.target instanceof Element

                ? event.target.closest(
                    'button, a, [role="button"], [data-logout], #logout'
                )

                : null;

        if (!elemento) {
            return;
        }

        const texto = (
            elemento.textContent || ''
        )
            .replace(/\s+/g, ' ')
            .trim();

        const esCerrar = elemento.matches(
            '[data-logout], #logout, [data-action="logout"], [data-cerrar-sesion]'
        ) || /^cerrar sesi[oó]n$/i.test(texto);

        if (!esCerrar) {
            return;
        }

        event.preventDefault();

        event.stopImmediatePropagation();

        if (cerrandoSesion) {
            return;
        }

        cerrandoSesion = true;

        if ('disabled' in elemento) {
            elemento.disabled = true;
        }

        elemento.setAttribute(
            'aria-busy',
            'true'
        );

        try {

            await api('/auth/logout', {
                method: 'POST'
            });

            setUser(null);

            window.location.replace('/#/');

        } catch (error) {

            toast(
                'No se pudo cerrar sesión: ' +
                error.message
            );

            cerrandoSesion = false;

            if ('disabled' in elemento) {
                elemento.disabled = false;
            }

            elemento.removeAttribute('aria-busy');
        }

    },
    true
);


/* ==========================================
   LUPA DE FOTOGRAFÍAS
========================================== */

document.addEventListener(
    'pointermove',
    event => {

        const principal = event.target.closest?.(
            '[data-pdp-zoom]'
        );

        if (
            principal?.classList.contains('zoomed')
        ) {

            updateMagnifier(
                principal,
                event.clientX,
                event.clientY
            );
        }
    }
);

document.addEventListener(
    'pointerout',
    event => {

        const principal = event.target.closest?.(
            '[data-pdp-zoom]'
        );

        if (
            principal &&
            !principal.contains(event.relatedTarget)
        ) {

            const lupa = principal.querySelector(
                '.fm-lens'
            );

            if (lupa) {
                lupa.style.opacity = '0';
            }
        }
    }
);


/* ==========================================
   EVENTOS DE LOS BOTONES
========================================== */

document.addEventListener(
    'click',
    async event => {

        const boton = event.target.closest?.(
            'button'
        );

        if (!boton) {
            return;
        }

        const d = boton.dataset;

        try {

            /* MINIATURAS */

            if ('pdpThumb' in d) {

                const galeria = boton.closest(
                    '.fm-gallery'
                );

                if (galeria) {

                    changeMainPhoto(
                        galeria,
                        Number(d.pdpThumb)
                    );
                }

                return;
            }


            /* FLECHAS DEL PRODUCTO */

            if ('pdpArrow' in d) {

                const galeria = boton.closest(
                    '.fm-gallery'
                );

                if (!galeria) {
                    return;
                }

                const miniaturas = [
                    ...galeria.querySelectorAll(
                        '[data-pdp-thumb]'
                    )
                ];

                const actual = miniaturas.findIndex(
                    elemento =>
                        elemento.classList.contains('active')
                );

                changeMainPhoto(
                    galeria,
                    actual + Number(d.pdpArrow)
                );

                return;
            }


            /* LUPA */

            if ('pdpZoom' in d) {

                const activo = boton.classList.toggle(
                    'zoomed'
                );

                boton.setAttribute(
                    'aria-pressed',
                    String(activo)
                );

                boton.setAttribute(
                    'aria-label',
                    activo
                        ? 'Desactivar lupa'
                        : 'Activar lupa'
                );

                const etiqueta = boton.querySelector(
                    '.fm-zoom-text'
                );

                if (etiqueta) {

                    etiqueta.textContent = activo
                        ? 'Desactivar lupa'
                        : 'Activar lupa';
                }

                const lupa = boton.querySelector(
                    '.fm-lens'
                );

                if (activo) {

                    const rect =
                        boton.getBoundingClientRect();

                    updateMagnifier(

                        boton,

                        event.detail === 0
                            ? rect.left + rect.width / 2
                            : event.clientX,

                        event.detail === 0
                            ? rect.top + rect.height / 2
                            : event.clientY

                    );

                } else if (lupa) {

                    lupa.style.opacity = '0';
                }

                return;
            }


            /* CATEGORÍAS */

            if ('categorySelect' in d) {

                event.preventDefault();

                const formulario = boton.closest(
                    '#ff'
                );

                if (!formulario) {
                    return;
                }

                const lista = boton.closest(
                    '.fm-category-list'
                );

                if (lista) {

                    setCategoryScroll(
                        lista.scrollTop
                    );
                }

                formulario.elements.categoryId.value =
                    d.categorySelect;

                const parametros = new URLSearchParams(

                    [...new FormData(formulario)].filter(
                        ([, valor]) => valor !== ''
                    )

                );

                const destino =
                    '#/catalogo' +
                    (
                        parametros.size
                            ? '?' + parametros
                            : ''
                    );

                if (location.hash === destino) {

                    render();

                } else {

                    location.hash = destino;
                }

                return;
            }


            /* FOTOGRAFÍAS DE TARJETAS */

            if ('photoIndex' in d) {

                const tarjeta = boton.closest(
                    '.fm-card'
                );

                const imagen = tarjeta?.querySelector(
                    '.fm-card-image img'
                );

                if (!imagen || !d.photoSrc) {
                    return;
                }

                imagen.src = d.photoSrc;

                tarjeta.querySelectorAll(
                    '[data-photo-index]'
                ).forEach(punto => {

                    const activo = punto === boton;

                    punto.classList.toggle(
                        'active',
                        activo
                    );

                    punto.setAttribute(
                        'aria-pressed',
                        String(activo)
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

            if ('add' in d) {

                const producto = await prod(d.add);

                setQty(
                    producto,
                    qtyOf(producto.id) + 1
                );

                toast('Artículo agregado');

                return;
            }


            /* AGREGAR DESDE EL DETALLE */

            if ('addn' in d) {

                const producto = await prod(d.addn);

                const cantidad = Math.max(

                    1,

                    Math.min(
                        Number($('#qn')?.value) || 1,
                        Number($('#qn')?.max) || 1
                    )

                );

                setQty(
                    producto,
                    qtyOf(producto.id) + cantidad
                );

                toast('Artículo agregado');

                render();

                return;
            }


            /* CANTIDADES */

            if (
                'inc' in d ||
                'dec' in d
            ) {

                const id = d.inc || d.dec;

                const producto = await prod(id);

                setQty(

                    producto,

                    qtyOf(id) +
                    (
                        'inc' in d ? 1 : -1
                    )

                );

                render();

                return;
            }


            /* ELIMINAR PRODUCTO */

            if ('rm' in d) {

                setCart(
                    cart.filter(item =>
                        String(item.productId) !==
                        String(d.rm)
                    )
                );

                saveCart();

                render();

                return;
            }


            /* CARRUSELES */

            if ('scroll' in d) {

                const carrusel = boton.closest(
                    '[data-carousel]'
                );

                const pista = carrusel?.querySelector(
                    '[data-track]'
                );

                if (!pista) {
                    return;
                }

                const productos = Boolean(
                    carrusel.closest(
                        '.fm-product-carousel'
                    )
                );

                pista.scrollBy({

                    left:
                        Number(d.scroll) *
                        (
                            productos
                                ? pista.clientWidth
                                : pista.clientWidth * 0.8
                        ),

                    behavior:
                        window.matchMedia(
                            '(prefers-reduced-motion: reduce)'
                        ).matches
                            ? 'auto'
                            : 'smooth'
                });

                return;
            }


            /* BANNER */

            if ('slide' in d) {

                pintarBanner(
                    Number(d.slide)
                );

                iniciarBannerAutomatico();

                return;
            }


            /* MENÚ */

            if ('menu' in d) {

                const nav = $('#nav');

                if (!nav) {
                    return;
                }

                const abierto = nav.classList.contains(
                    'hidden'
                );

                nav.classList.toggle(
                    'hidden',
                    !abierto
                );

                nav.classList.toggle(
                    'flex',
                    abierto
                );

                boton.setAttribute(
                    'aria-expanded',
                    String(abierto)
                );

                return;
            }


            /* VACIAR CARRITO */

            if ('clear' in d) {

                setCart([]);

                saveCart();

                render();

                return;
            }


            /* CUENTA DE PRUEBA */

            if ('demo' in d) {

                const sesion = await api(
                    '/auth/demo-login',
                    {
                        method: 'POST'
                    }
                );

                setUser(sesion);

                location.hash = '#/cuenta';

                render();

                return;
            }

        } catch (error) {

            toast(error.message);
        }

    }
);


/* ==========================================
   GALERÍA CON TECLADO
========================================== */

document.addEventListener(
    'keydown',
    event => {

        if (
            ![
                'ArrowLeft',
                'ArrowRight'
            ].includes(event.key)
        ) {
            return;
        }

        const galeria = event.target.closest?.(
            '.fm-gallery'
        );

        if (!galeria) {
            return;
        }

        event.preventDefault();

        const direccion =
            event.key === 'ArrowLeft' ? -1 : 1;

        galeria.querySelector(
            `[data-pdp-arrow="${direccion}"]`
        )?.click();
    }
);


/* ==========================================
   FORMULARIOS
========================================== */

document.addEventListener(
    'submit',
    async event => {

        const formulario = event.target;

        if (![
            'sf',
            'ff',
            'lf',
            'rf',
            'co'
        ].includes(formulario.id)) {
            return;
        }

        event.preventDefault();


        /* BUSCADOR */

        if (formulario.id === 'sf') {

            location.hash =
                '#/catalogo?q=' +
                encodeURIComponent(
                    $('#sq')?.value || ''
                );

            return;
        }


        /* FILTROS */

        if (formulario.id === 'ff') {

            const parametros = new URLSearchParams(

                [...new FormData(formulario)].filter(
                    ([, valor]) => valor !== ''
                )

            );

            const destino =
                '#/catalogo' +
                (
                    parametros.size
                        ? '?' + parametros
                        : ''
                );

            if (location.hash === destino) {

                render();

            } else {

                location.hash = destino;
            }

            return;
        }


        /* LOGIN Y REGISTRO */

        if (
            formulario.id === 'lf' ||
            formulario.id === 'rf'
        ) {

            if (
                formulario.dataset.enviando === '1'
            ) {
                return;
            }

            const datos = Object.fromEntries(
                new FormData(formulario)
            );

            const boton = formulario.querySelector(
                '[type="submit"], button'
            );

            formulario.dataset.enviando = '1';

            if (boton) {
                boton.disabled = true;
            }

            const mensaje = $('#ae');

            if (mensaje) {
                mensaje.textContent = '';
            }

            try {

                const sesion = await api(

                    formulario.id === 'lf'
                        ? '/auth/login'
                        : '/auth/register',

                    {
                        method: 'POST',
                        body: datos
                    }

                );

                setUser(sesion);

                render();

            } catch (error) {

                if (mensaje) {

                    mensaje.textContent = error.fields

                        ? 'Revisa los datos del formulario.'

                        : error.message;

                } else {

                    toast(error.message);
                }

                if (boton) {
                    boton.disabled = false;
                }

                delete formulario.dataset.enviando;
            }

            return;
        }


        /* ======================================
           FINALIZAR COMPRA
        ====================================== */

        if (formulario.id === 'co') {

            if (
                formulario.dataset.enviando === '1'
            ) {
                return;
            }

            const datos = Object.fromEntries(
                new FormData(formulario)
            );

            const errores = {};
            const delivery = formulario.elements.delivery.value;


            /* NOMBRE */

            if (
                String(datos.name || '').trim().length < 3
            ) {

                errores.name =
                    'Escribe tu nombre completo.';
            }


            /* CORREO */

            if (
                !/^\S+@\S+\.\S+$/.test(
                    datos.email || ''
                )
            ) {

                errores.email =
                    'Correo electrónico no válido.';
            }


            /* DIRECCIÓN */

                        if (delivery === 'domicilio') {
                for (const campo of ['calle', 'numeroExterior', 'colonia', 'ciudad', 'estado']) {
                    if (!String(datos[campo] || '').trim()) {
                        errores[campo] = 'Este campo es obligatorio.';
                    }
                }

                if (!/^\d{5}$/.test(String(datos.codigoPostal || ''))) {
                    errores.codigoPostal = 'Introduce un código postal de 5 dígitos.';
                }
            }

            /* ERRORES */

            formulario.querySelectorAll(
                '[data-err]'
            ).forEach(elemento => {

                elemento.textContent =
                    errores[elemento.dataset.err] || '';

            });

            const mensaje = formulario.querySelector(
                '#ce'
            );

            if (mensaje) {
                mensaje.textContent = '';
            }

            if (Object.keys(errores).length) {
                return;
            }


            /* BLOQUEAR ENVÍOS REPETIDOS */

            const boton = formulario.querySelector(
                '[type="submit"]'
            );

            formulario.dataset.enviando = '1';

            if (boton) {

                boton.disabled = true;

                boton.textContent =
                    'Registrando pedido…';
            }

            try {

                /* CREAR PEDIDO */

                const lineas = cart.map(({ productId, quantity }) => ({ productId, quantity }));
                const cuerpo = {
                    lines: lineas,
                    customer: { name: datos.name, email: datos.email },
                    address: {
                        calle: datos.calle,
                        numeroExterior: datos.numeroExterior,
                        colonia: datos.colonia,
                        codigoPostal: datos.codigoPostal,
                        ciudad: datos.ciudad,
                        estado: datos.estado
                    },
                    delivery,
                    paymentMethod: datos.paymentMethod
                };

                const tarjeta = datos.paymentMethod === 'tarjeta';
                if (tarjeta) {
                    const firma = JSON.stringify(cuerpo);
                    if (formulario.checkoutStripe?.firma !== firma) {
                        formulario.checkoutStripe = { firma, id: crypto.randomUUID() };
                    }
                    cuerpo.checkoutRequestId = formulario.checkoutStripe.id;
                }

                const pedido = await api('/orders', { method: 'POST', body: cuerpo });

                if (tarjeta) {
                    recordarCarritoStripe(pedido.id, lineas);
                    if (pedido.checkoutUrl) {
                        location.assign(pedido.checkoutUrl);
                    } else {
                        location.hash = `#/pago/${pedido.id.slice(4)}`;
                    }
                    return;
                }
                /* VACIAR CARRITO */

                setCart([]);

                saveCart();


                /* MOSTRAR CONFIRMACIÓN */


app.innerHTML = `

    <section class="fm-pay-success">

        <div class="fm-pay-success-icon">
            ✓
        </div>

        <span>
            FERROMAX · PEDIDO REGISTRADO
        </span>

        <h1>
            ¡Tu pedido se registró correctamente!
        </h1>

        <p>
            Gracias por comprar en FerroMax.
            Puedes consultar los detalles de tu pedido
            y su estado desde tu cuenta.
        </p>

        <div class="fm-pay-success-details">

            <div>
                <span>Folio del pedido</span>

                <strong>
                    ${esc(pedido.id)}
                </strong>
            </div>

            <div>
                <span>Total del pedido</span>

                <strong>
                    ${mxn(pedido.total)}
                </strong>
            </div>

        </div>

        <a
            href="#/cuenta?tab=pedidos"
            class="fm-pay-submit"
        >
            Ver mis pedidos
        </a>

    </section>
`;


            } catch (error) {

                if (mensaje) {

                    mensaje.textContent =
                        error.message;

                } else {

                    toast(error.message);
                }

                    if (boton) {
                        boton.disabled = false;
                        actualizarBotonCheckout(formulario);
                }

                delete formulario.dataset.enviando;
            }

            return;
        }
    }
);
