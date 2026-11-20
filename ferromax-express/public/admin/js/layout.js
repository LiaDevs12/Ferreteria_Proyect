import { $, esc, call, me, svgIcon } from './core.js';
import { addExtraStyles } from './styles.js';

/* ==========================================
   ESTRUCTURA DEL PANEL FERROMAX
========================================== */

export function layout(
    title,
    active,
    body,
    knownCategories = null
) {
    addExtraStyles();

    /* ======================================
       ENLACES DEL MENÚ LATERAL
    ====================================== */

    const navLink = (id, label, href) => `
        <a
            class="${active === id ? 'active' : ''}"
            href="${href}"
        >
            <span class="nav-icon">
                ${svgIcon(id)}
            </span>

            <span class="nav-label">
                ${label}
            </span>
        </a>
    `;

    /* ======================================
       INFORMACIÓN DEL USUARIO
    ====================================== */

    const roleName =
        me.rol === 'ADMINISTRADOR'
            ? 'Administrador'
            : me.rol === 'EDITOR'
                ? 'Editor'
                : 'Inventario';

    const fullName = [
        me.nombre,
        me.apellido_paterno
    ].filter(Boolean).join(' ');

    /* ======================================
       PERMISOS POR ROL
    ====================================== */

    const isAdmin =
        me.rol === 'ADMINISTRADOR';

    const isEditor =
        me.rol === 'EDITOR';

    const isInventory =
        me.rol === 'INVENTARIO';

    const canManageProducts =
        isAdmin || isEditor;

    /* ======================================
       ESTADO DEL MENÚ DE PRODUCTOS
    ====================================== */

    const onProductsPage =
        active === 'products';

    const selectedCategory = new URLSearchParams(
        location.search
    ).get('categoria') || '';

    /* ======================================
       ESTRUCTURA PRINCIPAL
    ====================================== */

    document.body.innerHTML = `
        <div class="shell">

            <!-- BARRA LATERAL ORIGINAL -->

            <aside class="side">

                <!-- LOGO FERROMAX -->

                <div class="brand">

                    <div
                        class="fm-logo-text"
                        role="img"
                        aria-label="FerroMax - Ferretería en línea"
                    >

                        <span class="fm-logo-name">
                            FERROMAX
                        </span>

                        <span class="fm-logo-subtitle">
                            FERRETERÍA EN LÍNEA
                        </span>

                    </div>

                </div>

                <!-- INFORMACIÓN DEL USUARIO -->

                <div class="sidebar-user">

                    <div class="sidebar-avatar">

                        ${
                            me.foto_perfil
                                ? `
                                    <img
                                        src="${esc(me.foto_perfil)}"
                                        alt="Foto de perfil"
                                        onerror="this.remove()"
                                    >
                                `
                                : ''
                        }

                        <span class="sidebar-avatar-fallback">

                            ${esc(
                                (me.nombre || 'A')
                                    .charAt(0)
                                    .toUpperCase()
                            )}

                        </span>

                    </div>

                    <div class="sidebar-user-info">

                        <strong>
                            ${esc(fullName)}
                        </strong>

                        <span>
                            ${esc(roleName)}
                        </span>

                    </div>

                </div>

                <!-- MENÚ PRINCIPAL -->

                <nav class="nav">

                    <!-- DASHBOARD: TODOS LOS ROLES -->

                    ${navLink(
                        'home',
                        'Dashboard',
                        'dashboard.html'
                    )}


                    <!-- =========================
                         ROL INVENTARIO
                    ========================= -->

                    ${
                        isInventory
                            ? `

                                ${navLink(
                                    'products',
                                    'Productos',
                                    'inventario.html#productos'
                                )}

                                ${navLink(
                                    'reports',
                                    'Crear reporte',
                                    'inventario.html#nuevo-reporte'
                                )}

                                ${navLink(
                                    'reports',
                                    'Mis reportes',
                                    'inventario.html#mis-reportes'
                                )}

                            `
                            : ''
                    }


                    <!-- =========================
                         ADMINISTRADOR Y EDITOR
                         MARCAS Y CATEGORÍAS
                    ========================= -->

                    ${
                        canManageProducts
                            ? `

                                ${navLink(
                                    'brands',
                                    'Marcas',
                                    'marcas.html'
                                )}

                                ${navLink(
                                    'categories',
                                    'Categorías',
                                    'categorias.html'
                                )}

                            `
                            : ''
                    }


                    <!-- =========================
                         SUBMENÚ DE PRODUCTOS
                         ADMINISTRADOR Y EDITOR
                    ========================= -->

                    ${
                        canManageProducts
                            ? `

                                <div class="fm-nav-group">

                                    <button
                                        id="sidebarProductsToggle"
                                        class="fm-products-toggle ${
                                            onProductsPage
                                                ? 'active'
                                                : ''
                                        }"
                                        type="button"
                                        aria-expanded="${onProductsPage}"
                                        aria-controls="sidebarProductsMenu"
                                    >

                                        <span class="nav-icon">
                                            ${svgIcon('products')}
                                        </span>

                                        <span class="nav-label">
                                            Productos
                                        </span>

                                        <svg
                                            class="fm-menu-chevron"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >

                                            <path
                                                d="m6 9 6 6 6-6"
                                            />

                                        </svg>

                                    </button>

                                    <div
                                        id="sidebarProductsMenu"
                                        class="fm-products-submenu"
                                        ${
                                            onProductsPage
                                                ? ''
                                                : 'hidden'
                                        }
                                    >

                                        <a
                                            href="productos.html"
                                            class="${
                                                onProductsPage &&
                                                !selectedCategory
                                                    ? 'selected'
                                                    : ''
                                            }"
                                        >
                                            Todos los productos
                                        </a>

                                        <div id="sidebarCategories">

                                            <span class="fm-nav-loading">
                                                Cargando categorías...
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            `
                            : ''
                    }


                    <!-- =========================
                         REPORTES ADMINISTRATIVOS
                         SOLO ADMINISTRADOR
                    ========================= -->

                    ${
                        isAdmin
                            ? navLink(
                                'reports',
                                'Reportes de inventario',
                                'reportes.html'
                            )
                            : ''
                    }


                    <!-- =========================
                         USUARIOS Y ROLES
                         SOLO ADMINISTRADOR
                    ========================= -->

                    ${
                        isAdmin
                            ? navLink(
                                'users',
                                'Usuarios y roles',
                                'usuarios.html'
                            )
                            : ''
                    }


                    <!-- =========================
                         PERFIL: TODOS LOS ROLES
                    ========================= -->

                    ${navLink(
                        'profile',
                        'Mi perfil',
                        'perfil.html'
                    )}

                </nav>


                <!-- PIE DEL MENÚ LATERAL -->

                <div class="side-bottom">

                    <span>
                        Panel administrativo
                    </span>

                    <small>
                        FerroMax · Gestión interna
                    </small>

                </div>

            </aside>


            <!-- CONTENIDO PRINCIPAL -->

            <main class="main">

                <header class="top">

                    <div class="crumb">
                        FERROMAX / ${esc(title)}
                    </div>

                </header>

                ${body}

            </main>

        </div>
    `;


    /* ======================================
       CONFIGURACIÓN DEL MENÚ DE PRODUCTOS

       Solo ADMINISTRADOR y EDITOR.
       INVENTARIO no necesita este submenú.
    ====================================== */

    if (!canManageProducts) {
        return;
    }

    const toggle = $('#sidebarProductsToggle');

    const menu = $('#sidebarProductsMenu');

    /* ======================================
       ABRIR Y CERRAR SUBMENÚ
    ====================================== */

    if (toggle && menu) {

        toggle.addEventListener('click', () => {

            menu.hidden = !menu.hidden;

            toggle.setAttribute(
                'aria-expanded',
                String(!menu.hidden)
            );

        });

    }


    /* ======================================
       MOSTRAR CATEGORÍAS
    ====================================== */

    function showCategories(categories) {

        const target = $('#sidebarCategories');

        if (!target) {
            return;
        }

        if (!Array.isArray(categories)) {
            categories = [];
        }

        target.innerHTML = categories.length
            ? categories.map(category => `

                <a
                    href="productos.html?categoria=${
                        encodeURIComponent(category.id)
                    }"

                    data-side-category="${
                        esc(category.id)
                    }"

                    class="${
                        onProductsPage &&
                        String(category.id) === selectedCategory
                            ? 'selected'
                            : ''
                    }"
                >

                    ${esc(category.nombre)}

                </a>

            `).join('')

            : `

                <span class="fm-nav-loading">
                    Sin categorías registradas
                </span>

            `;

    }


    /* ======================================
       CARGAR CATEGORÍAS
    ====================================== */

    if (Array.isArray(knownCategories)) {

        showCategories(knownCategories);

    } else {

        call('/catalog-options')

            .then(data => {

                showCategories(
                    data?.categories || []
                );

            })

            .catch(error => {

                console.error(
                    'Error al cargar categorías:',
                    error
                );

                const target = $('#sidebarCategories');

                if (target) {

                    target.innerHTML = `

                        <span class="fm-nav-loading">
                            No se pudieron cargar las categorías
                        </span>

                    `;

                }

            });

    }

}