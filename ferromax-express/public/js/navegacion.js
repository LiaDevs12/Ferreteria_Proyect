import { $, app, esc, user } from './core.js';
import { routes } from './rutas.js';
import { empty } from './catalogo.js';
import { iniciarCarruselMarcas } from './marcas.js';

/* ==========================================
   NAVEGACIÓN
========================================== */

let renderNumber = 0;

export async function render() {
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
            if (current === renderNumber) iniciarCarruselMarcas();

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
