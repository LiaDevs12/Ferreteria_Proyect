
import { esc } from './core.js';

const asegurarEstilosAcceso = () => {
    if (document.querySelector('[data-ferromax-acceso-css]')) return;

    const enlace = document.createElement('link');
    enlace.rel = 'stylesheet';
    enlace.href = '/css/acceso.css';
    enlace.setAttribute('data-ferromax-acceso-css', '');
    document.head.append(enlace);

    document.addEventListener('change', event => {
        const toggle = event.target.closest?.('[data-password-toggle]');
        if (!toggle) return;

        const input = document.getElementById(toggle.dataset.passwordToggle);
        if (input) input.type = toggle.checked ? 'text' : 'password';
    });
};

const icono = (nombre) => {
    const rutas = {
        caja: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="m3 7.5 9 5 9-5M12 12.5V21"/>',
        corazon: '<path d="M20.8 8.5c0 4.2-8.8 10.1-8.8 10.1S3.2 12.7 3.2 8.5a4.8 4.8 0 0 1 8.8-2.4 4.8 4.8 0 0 1 8.8 2.4Z"/>',
        perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        flecha: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'
    };

    return `
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            ${rutas[nombre] || rutas.perfil}
        </svg>
    `;
};

const campo = ({
    id,
    label,
    name,
    type = 'text',
    autocomplete = '',
    placeholder = '',
    extra = ''
}) => `
    <div class="fm-auth-field">
        <label for="${id}">${label}</label>

        <input
            id="${id}"
            class="fm-auth-input"
            type="${type}"
            name="${name}"
            autocomplete="${autocomplete}"
            placeholder="${placeholder}"
            ${extra}
            required
        >
    </div>
`;

export function vistaCuenta(cliente, googleClientId = '') {
    asegurarEstilosAcceso();

    if (cliente) {
        const nombre = String(cliente.name || 'Cliente').trim();
        const inicial = nombre.charAt(0).toLocaleUpperCase('es-MX');

        return `
            <section class="fm-auth-page">

                <div class="fm-auth-shell fm-auth-shell-session">

                    <aside class="fm-auth-brand">

                        <a href="#/" class="fm-auth-brand-logo">
                            FERROMAX
                            <span>FERRETERÍA EN LÍNEA</span>
                        </a>

                        <div class="fm-auth-brand-message">
                            <span class="fm-auth-brand-kicker">
                                ÁREA DE CLIENTES
                            </span>

                            <h2>Tu espacio, tus pedidos.</h2>

                            <p>
                                Consulta tus compras y vuelve a explorar
                                nuestras herramientas y materiales.
                            </p>
                        </div>

                        <p class="fm-auth-brand-foot">
                            FERROMAX · TU FERRETERÍA EN LÍNEA
                        </p>

                    </aside>

                    <div class="fm-auth-main fm-auth-session">

                        <span class="fm-auth-eyebrow">
                            MI CUENTA
                        </span>

                        <div class="fm-auth-avatar" aria-hidden="true">
                            ${esc(inicial)}
                        </div>

                        <h1>¡Hola, ${esc(nombre)}!</h1>

                        <p class="fm-auth-subtitle">
                            Tu sesión está iniciada.
                        </p>

                        <div class="fm-auth-session-info">
                            <span>
                                ${icono('correo')}
                                Correo electrónico
                            </span>

                            <strong>
                                ${esc(cliente.email || 'No disponible')}
                            </strong>
                        </div>

                        ${cliente.isDemo ? `
                            <p class="fm-auth-demo-pill">
                                Estás utilizando la cuenta de demostración.
                            </p>
                        ` : ''}

                        <a
                            class="fm-auth-primary fm-auth-link-button"
                            href="#/pedidos"
                        >
                            Ver mis pedidos
                            ${icono('flecha')}
                        </a>

                        <a class="fm-auth-back-link" href="#/catalogo">
                            Seguir comprando
                        </a>

                        <button
                            type="button"
                            class="fm-auth-logout"
                            data-logout
                        >
                            Cerrar sesión
                        </button>

                    </div>

                </div>

            </section>
        `;
    }

    return `
        <section
            class="fm-auth-page"
            aria-label="Acceso a FerroMax"
        >

            <div class="fm-auth-shell">

                <aside class="fm-auth-brand">

                    <a href="#/" class="fm-auth-brand-logo">
                        FERROMAX
                        <span>FERRETERÍA EN LÍNEA</span>
                    </a>

                    <div class="fm-auth-brand-message">

                        <span class="fm-auth-brand-kicker">
                            BIENVENIDO A FERROMAX
                        </span>

                        <h2>
                            Todo para tus proyectos,
                            en un solo lugar.
                        </h2>

                        <p>
                            Crea tu cuenta y lleva tus productos
                            favoritos y pedidos siempre contigo.
                        </p>

                        <div class="fm-auth-benefits">

                            <div>
                                <span>${icono('caja')}</span>
                                <p>Consulta tus pedidos</p>
                            </div>

                            <div>
                                <span>${icono('corazon')}</span>
                                <p>Guarda tus productos favoritos</p>
                            </div>

                            <div>
                                <span>${icono('perfil')}</span>
                                <p>Administra tu cuenta</p>
                            </div>

                        </div>

                    </div>

                    <p class="fm-auth-brand-foot">
                        FERROMAX · TU FERRETERÍA EN LÍNEA
                    </p>

                </aside>

                <div class="fm-auth-main">

                    <span class="fm-auth-eyebrow">
                        ÁREA DE CLIENTES
                    </span>

                    <h1>Bienvenido</h1>

                    <p class="fm-auth-subtitle">
                        Accede a tu cuenta o regístrate para comenzar.
                    </p>

                    <div class="fm-auth-switcher">

                        <input
                            type="radio"
                            class="fm-auth-radio"
                            id="fm-auth-tab-login"
                            name="fm-auth-vista"
                            checked
                        >

                        <input
                            type="radio"
                            class="fm-auth-radio"
                            id="fm-auth-tab-register"
                            name="fm-auth-vista"
                        >

                        <div
                            class="fm-auth-tabs"
                            role="group"
                            aria-label="Elegir formulario"
                        >
                            <label for="fm-auth-tab-login">
                                Iniciar sesión
                            </label>

                            <label for="fm-auth-tab-register">
                                Crear cuenta
                            </label>
                        </div>

                        <!-- INICIAR SESIÓN -->

                        <form
                            id="lf"
                            class="fm-auth-form fm-auth-form-login"
                            autocomplete="on"
                        >

                            ${campo({
                                id: 'fm-login-email',
                                label: 'Correo electrónico',
                                name: 'email',
                                type: 'email',
                                autocomplete: 'email',
                                placeholder: 'nombre@correo.com',
                                extra: 'maxlength="254"'
                            })}

                            ${campo({
                                id: 'fm-login-password',
                                label: 'Contraseña',
                                name: 'password',
                                type: 'password',
                                autocomplete: 'current-password',
                                placeholder: 'Escribe tu contraseña'
                            })}

                            <label class="fm-auth-show-pass">
                                <input
                                    type="checkbox"
                                    data-password-toggle="fm-login-password"
                                >
                                Mostrar contraseña
                            </label>

                            <button
                                type="submit"
                                class="fm-auth-primary"
                            >
                                Iniciar sesión
                                ${icono('flecha')}
                            </button>

                        </form>

                        <!-- CREAR CUENTA -->

                        <form
                            id="rf"
                            class="fm-auth-form fm-auth-form-register"
                            autocomplete="on"
                        >

                            <div class="fm-auth-fields-row">

                                ${campo({
                                    id: 'fm-register-name',
                                    label: 'Nombre',
                                    name: 'name',
                                    autocomplete: 'given-name',
                                    placeholder: 'Tu nombre',
                                    extra: 'minlength="2" maxlength="100"'
                                })}

                                ${campo({
                                    id: 'fm-register-lastname',
                                    label: 'Apellido paterno',
                                    name: 'apellido',
                                    autocomplete: 'family-name',
                                    placeholder: 'Tu apellido',
                                    extra: 'minlength="2" maxlength="100"'
                                })}

                            </div>

                            ${campo({
                                id: 'fm-register-email',
                                label: 'Correo electrónico',
                                name: 'email',
                                type: 'email',
                                autocomplete: 'email',
                                placeholder: 'nombre@correo.com',
                                extra: 'maxlength="254"'
                            })}

                            ${campo({
                                id: 'fm-register-password',
                                label: 'Contraseña',
                                name: 'password',
                                type: 'password',
                                autocomplete: 'new-password',
                                placeholder: 'Crea una contraseña segura',
                                extra: 'minlength="8" maxlength="72"'
                            })}

                            <label class="fm-auth-show-pass">
                                <input
                                    type="checkbox"
                                    data-password-toggle="fm-register-password"
                                >
                                Mostrar contraseña
                            </label>

                            <p class="fm-auth-field-note">
                                Utiliza entre 8 y 72 caracteres.
                            </p>

                            <button
                                type="submit"
                                class="fm-auth-primary"
                            >
                                Crear mi cuenta
                                ${icono('flecha')}
                            </button>

                        </form>

                    </div>

                    <p
                        id="ae"
                        class="fm-auth-error"
                        role="alert"
                        aria-live="polite"
                    ></p>

                    <div class="fm-auth-alternatives">

                        ${googleClientId ? `
                            <div class="fm-auth-divider">
                                <span>O continúa con</span>
                            </div>

                            <div
                                id="gbtn"
                                class="fm-auth-google"
                            ></div>
                        ` : ''}

                        <button
                            type="button"
                            data-demo
                            class="fm-auth-demo"
                        >
                            Entrar como usuario de prueba
                        </button>

                    </div>

                    <p class="fm-auth-terms">
                        Accede para consultar tus favoritos y
                        pedidos dentro de FerroMax.
                    </p>

                </div>

            </div>

        </section>
    `;
}
