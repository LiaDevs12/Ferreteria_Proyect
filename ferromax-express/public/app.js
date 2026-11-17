
/* ==========================================
   FERROMAX
   ARCHIVO PRINCIPAL DE LA TIENDA
========================================== */

import { header, footer } from '/ui.js';

import {
    $,
    api,
    esc,
    saveCart,
    setUser
} from './js/core.js';

import {
    render as renderPagina
} from './js/navegacion.js';

import './js/eventos.js';


/* ==========================================
   1. CARGAR ESTILOS DE LA TIENDA
========================================== */

function cargarEstilo(href, atributo) {

    if (
        document.querySelector(`link[${atributo}]`) ||
        document.querySelector(`link[href="${href}"]`)
    ) {
        return;
    }

    const link = document.createElement('link');

    link.rel = 'stylesheet';

    link.href = href;

    link.setAttribute(atributo, '');

    document.head.appendChild(link);
}


/* ESTILOS PRINCIPALES */

cargarEstilo(
    '/css/tienda.css',
    'data-fm-tienda-css'
);


/* ESTILOS DEL CHECKOUT */

cargarEstilo(
    '/css/checkout.css?v=2',
    'data-fm-checkout-css'
);


/* ==========================================
   2. CORRECCIONES VISUALES
========================================== */

function instalarAjustesVisuales() {

    if (
        document.getElementById(
            'fm-ajustes-navegacion-footer'
        )
    ) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'fm-ajustes-navegacion-footer';

    style.textContent = `

        /* ==================================
           NAVEGACIÓN
        ================================== */

        html,
        body {
            scroll-behavior: auto !important;
        }


        /* ==================================
           IMAGEN FOOTER1
        ================================== */

        .fm-footer-banner {

            display: block !important;

           

            height: 300px !important;

            min-height: 0 !important;

            max-height: 200px !important;

            padding: 0 !important;

            overflow: hidden !important;

            background-size: cover !important;

            background-position: center !important;

            background-repeat: no-repeat !important;
        }


        /* SI FOOTER1 UTILIZA IMG */

        .fm-footer-banner img {

            display: block !important;

            width: 100% !important;

            height: 150% !important;

            object-fit: cover !important;

            object-position: center !important;
        }


        /* ==================================
           TABLETS
        ================================== */

        @media (max-width: 900px) {

            .fm-footer-banner {

                height: 160px !important;

                max-height: 160px !important;
            }

        }


        /* ==================================
           CELULARES
        ================================== */

        @media (max-width: 600px) {

            .fm-footer-banner {

                width: calc(100% - 24px) !important;

                height: 120px !important;

                max-height: 120px !important;

                margin: 16px auto !important;

                border-radius: 9px;
            }

        }

    `;

    document.head.appendChild(style);
}


/* APLICAR ESTILOS */

instalarAjustesVisuales();


/* ==========================================
   3. CONFIGURACIÓN DEL SCROLL
========================================== */

/*
   Evita que el navegador restaure
   automáticamente la posición anterior
   al cambiar de apartado.
*/

if ('scrollRestoration' in history) {

    history.scrollRestoration = 'manual';

}


/* ==========================================
   4. REGRESAR AL INICIO
========================================== */

function irArriba() {

    window.scrollTo({

        top: 0,

        left: 0,

        behavior: 'instant'

    });

}


/* ==========================================
   5. CONTROL DE NAVEGACIÓN
========================================== */

let navegacionActual = 0;


/* ==========================================
   6. CAMBIAR DE APARTADO
========================================== */

async function navegar() {

    const solicitud = ++navegacionActual;

    const destino = location.hash;

    /*
       Al cambiar de apartado,
       regresar inmediatamente arriba.
    */

    irArriba();

    try {

        /*
           Ejecutar la navegación original
           desde js/navegacion.js.
        */

        await renderPagina();

    } finally {

        /*
           Si el usuario ya abrió otro
           apartado, no intervenir.
        */

        if (
            solicitud !== navegacionActual ||
            location.hash !== destino
        ) {
            return;
        }

        /*
           Esperar a que el navegador
           dibuje el contenido nuevo.
        */

        requestAnimationFrame(() => {

            if (
                solicitud !== navegacionActual ||
                location.hash !== destino
            ) {
                return;
            }

            irArriba();

            /*
               Segunda comprobación para evitar
               que el contenido cargado vuelva
               a desplazar la página.
            */

            requestAnimationFrame(() => {

                if (
                    solicitud === navegacionActual &&
                    location.hash === destino
                ) {

                    irArriba();

                }

            });

        });

    }

}


/* ==========================================
   7. DETECTAR CAMBIOS DE APARTADO
========================================== */

window.addEventListener(
    'hashchange',
    () => {

        navegar().catch(error => {

            console.error(
                'Error al cambiar de apartado:',
                error
            );

        });

    }
);


/* ==========================================
   8. CARGAR ENCABEZADO Y FOOTER
========================================== */

const cabecera = $('#hdr');

const pie = $('#ftr');


/* ENCABEZADO */

if (cabecera) {

    cabecera.innerHTML = header();

}


/* FOOTER */

if (pie) {

    pie.innerHTML = footer();

}


/* ==========================================
   9. CARGAR CATEGORÍAS DESDE MYSQL
========================================== */

api('/categories')

    .then(categories => {

        if (!Array.isArray(categories)) {

            return;

        }

        /*
           Categorías del footer
           y del menú principal.
        */

        const apartados = [

            [
                '#fcat',
                categories.slice(0, 6)
            ],

            [
                '#hcat',
                categories
            ]

        ];

        for (const [selector, items] of apartados) {

            const elemento = $(selector);

            if (!elemento) {

                continue;

            }

            const contenido = items.map(category => `

                <li>

                    <a
                        href="#/catalogo?categoryId=${
                            encodeURIComponent(category.id)
                        }"
                    >

                        ${esc(category.name)}

                    </a>

                </li>

            `).join('');

            if (contenido) {

                elemento.innerHTML = contenido;

            }

        }

    })

    .catch(error => {

        console.warn(
            'No se pudieron cargar las categorías:',
            error
        );

    });


/* ==========================================
   10. INICIALIZAR CARRITO
========================================== */

saveCart();


/* ==========================================
   11. RECUPERAR SESIÓN
========================================== */

api('/auth/me')

    .then(usuario => {

        setUser(usuario);

    })

    .catch(() => {

        setUser(null);

    })

    .finally(() => {

        /*
           Cargar la página inicial usando
           el sistema de navegación corregido.
        */

        navegar().catch(error => {

            console.error(
                'Error al abrir la página:',
                error
            );

        });

    });


/* ==========================================
   FIN DEL ARCHIVO PRINCIPAL FERROMAX
========================================== */
