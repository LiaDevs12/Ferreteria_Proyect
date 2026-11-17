import { $, esc, call, me, svgIcon } from './core.js';
import { addExtraStyles } from './styles.js';

/* ==========================================
   ESTRUCTURA DEL PANEL
========================================== */

export function layout(
    title,
    active,
    body,
    knownCategories = null
) {
    addExtraStyles();

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

    const canManageProducts = [
        'ADMINISTRADOR',
        'EDITOR'
    ].includes(me.rol);

    const onProductsPage = active === 'products';

    const selectedCategory = new URLSearchParams(
        location.search
    ).get('categoria') || '';

    document.body.innerHTML = `
        <div class="shell">

            <aside class="side">

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

                <div class="sidebar-user">

                    <div class="sidebar-avatar">

                        ${me.foto_perfil ? `
                            <img
                                src="${esc(me.foto_perfil)}"
                                alt="Foto de perfil"
                                onerror="this.remove()"
                            >
                        ` : ''}

                        <span class="sidebar-avatar-fallback">
                            ${esc(
                                (me.nombre || 'A')
                                    .charAt(0)
                                    .toUpperCase()
                            )}
                        </span>

                    </div>

                    <div class="sidebar-user-info">
                        <strong>${esc(fullName)}</strong>
                        <span>${esc(roleName)}</span>
                    </div>

                </div>

                <nav class="nav">

                    ${navLink(
                        'home',
                        'Dashboard',
                        'dashboard.html'
                    )}

                    ${[
    'ADMINISTRADOR',
    'EDITOR'
].includes(me.rol) ? `

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

` : ''}

                    ${canManageProducts ? `
                        <div class="fm-nav-group">

                            <button
                                id="sidebarProductsToggle"
                                class="fm-products-toggle ${
                                    onProductsPage ? 'active' : ''
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
                                    <path d="m6 9 6 6 6-6"/>
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
                    ` : ''}

${me.rol === 'ADMINISTRADOR'
    ? navLink(
        'brands',
        'Marcas',
        'marcas.html'
    )
    : ''}


                    ${me.rol === 'ADMINISTRADOR'
                        ? navLink(
                            'reports',
                            'Reportes de inventario',
                            'reportes.html'
                        )
                        : ''}

                    ${me.rol === 'ADMINISTRADOR'
                        ? navLink(
                            'users',
                            'Usuarios y roles',
                            'usuarios.html'
                        )
                        : ''}

                    ${navLink(
                        'profile',
                        'Mi perfil',
                        'perfil.html'
                    )}

                </nav>

                <div class="side-bottom">
                    <span>Panel administrativo</span>
                    <small>
                        FerreMax · Gestión interna
                    </small>
                </div>

            </aside>

            <main class="main">

                <header class="top">
                    <div class="crumb">
                        FERREMAX / ${esc(title)}
                    </div>
                </header>

                ${body}

            </main>

        </div>
    `;

    if (!canManageProducts) return;

    const toggle = $('#sidebarProductsToggle');
    const menu = $('#sidebarProductsMenu');

    toggle.addEventListener('click', () => {
        menu.hidden = !menu.hidden;

        toggle.setAttribute(
            'aria-expanded',
            String(!menu.hidden)
        );
    });

    function showCategories(categories) {
        const target = $('#sidebarCategories');

        if (!target) return;

        target.innerHTML = categories.length
            ? categories.map(category => `
                <a
                    href="productos.html?categoria=${
                        encodeURIComponent(category.id)
                    }"
                    data-side-category="${esc(category.id)}"
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

    if (Array.isArray(knownCategories)) {
        showCategories(knownCategories);
    } else {
        call('/catalog-options')
            .then(data => {
                showCategories(data.categories || []);
            })
            .catch(() => {
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
