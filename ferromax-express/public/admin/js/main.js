
import { esc, call } from './core.js';

import { login } from './auth.js';
import { dashboard } from './dashboard.js';
import { products } from './products.js';
import { brandsPage } from './brands.js';
import { users } from './users.js';
import { reports } from './reports.js';
import { profile } from './profile.js';
import { orders } from './orders.js';
import {
    manageBrands,
    manageCategories
} from './catalogo-editor.js';

/* ==========================================
   FERROMAX
   CONTROL DE PAGINAS ADMINISTRATIVAS
========================================== */

const page = location.pathname
    .split('/')
    .pop();

const pages = {
    'login.html': login,
    'dashboard.html': dashboard,
    'pedidos.html': orders,
    'productos.html': products,
    'marcas.html': brandsPage,
    'usuarios.html': users,
    'reportes.html': reports,
    'perfil.html': profile,

    // Proveedores se carga solo cuando se utiliza.
    'proveedores.html': async () => {

        const modulo = await import('./suppliers.js');

        if (typeof modulo.suppliers !== 'function') {
            throw new Error(
                'El módulo de Proveedores no exporta la función suppliers.'
            );
        }

        await modulo.suppliers();
    }
};

/* ==========================================
   ICONOS DEL MENU
========================================== */

const iconoPedidos = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <rect x="4" y="3" width="16" height="18" rx="2"/>
        <path d="M8 3v4h8V3"/>
        <path d="M8 11h8"/>
        <path d="M8 15h8"/>
        <path d="M8 19h5"/>
    </svg>
`;

const iconoProveedores = `
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <path d="M3 9 12 4l9 5v11H3V9Z"/>
        <path d="M8 20v-7h8v7"/>
        <path d="M3 10h18"/>
        <path d="M9 13h6"/>
    </svg>
`;

/* ==========================================
   CREAR ENLACE DEL MENU
========================================== */

function crearEnlace(nombre, destino, icono) {

    const enlace = document.createElement('a');

    enlace.href = destino;

    if (page === destino) {
        enlace.classList.add('active');
    }

    enlace.innerHTML = `
        <span class="nav-icon">
            ${icono}
        </span>

        <span class="nav-label">
            ${esc(nombre)}
        </span>
    `;

    return enlace;
}

/* ==========================================
   INCORPORAR PEDIDOS Y PROVEEDORES
   SIN CAMBIAR EL MENU ORIGINAL
========================================== */

async function agregarOpcionesAlMenu() {

    if (!page || page === 'login.html') {
        return;
    }

    const menu = document.querySelector('.side .nav');

    if (!menu) return;

    const usuario = await call('/me');

    if (
        !usuario ||
        usuario.rol !== 'ADMINISTRADOR'
    ) {
        return;
    }

    /* ======================================
       PEDIDOS
    ====================================== */

    if (!menu.querySelector('a[href="pedidos.html"]')) {

        const enlacePedidos = crearEnlace(
            'Pedidos',
            'pedidos.html',
            iconoPedidos
        );

        const dashboardLink = menu.querySelector(
            'a[href="dashboard.html"]'
        );

        if (dashboardLink) {
            dashboardLink.after(enlacePedidos);
        } else {
            menu.prepend(enlacePedidos);
        }
    }

    /* ======================================
       PROVEEDORES
    ====================================== */

    if (!menu.querySelector('a[href="proveedores.html"]')) {

        const enlaceProveedores = crearEnlace(
            'Proveedores',
            'proveedores.html',
            iconoProveedores
        );

        const marcasLink = menu.querySelector(
            'a[href="marcas.html"]'
        );

        if (marcasLink) {

            marcasLink.after(enlaceProveedores);

        } else {

            const productosLink = menu.querySelector(
                'a[href="productos.html"]'
            );

            if (productosLink) {
                productosLink.after(enlaceProveedores);
            } else {
                menu.appendChild(enlaceProveedores);
            }
        }
    }
}

/* ==========================================
   INICIAR PAGINA
========================================== */

async function iniciarPagina() {

    const funcion = pages[page] || login;

    try {

        await funcion();

        try {

            await agregarOpcionesAlMenu();

        } catch (errorMenu) {

            console.error(
                'No se pudieron actualizar las opciones del menú:',
                errorMenu
            );
        }

    } catch (error) {

        console.error(
            'Error al cargar la página:',
            error
        );

        document.body.innerHTML = `
            <div class="login-wrap">

                <div class="login">

                    <h1>Error al cargar FerreMax</h1>

                    <p>
                        ${esc(error.message)}
                    </p>

                    <a href="login.html">
                        Volver al inicio de sesión
                    </a>

                </div>

            </div>
        `;
    }
}

iniciarPagina();
