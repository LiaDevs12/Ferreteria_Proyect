import { call, msg } from './core.js';

function cargarGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar el acceso con Google.'));
        document.head.append(script);
    });
}

function enviar(ruta, cuerpo) {
    return call(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });
}

export async function iniciarAccesoGoogle(formularioManual) {
    const config = await call('/auth/google/config');
    if (!config.googleClientId) return;

    const acceso = document.createElement('section');
    acceso.innerHTML = `
        <p class="muted">O inicia sesión con Google</p>
        <div id="login-google"></div>

        <form id="vincular-google" hidden>
            <div class="field">
                <label for="vincular-password">Contraseña actual de FerroMax</label>
                <input id="vincular-password" type="password" autocomplete="current-password" required>
            </div>
            <button class="btn" type="submit">Vincular cuenta de Google</button>
        </form>

        <p id="reiniciar-google" hidden>
            <a href="login.html">Volver al inicio de sesión</a>
        </p>
    `;

    await cargarGoogle();
    formularioManual.after(acceso);

    const botonGoogle = acceso.querySelector('#login-google');
    const vincular = acceso.querySelector('#vincular-google');
    const password = acceso.querySelector('#vincular-password');
    const botonVincular = vincular.querySelector('button');
    const reiniciar = acceso.querySelector('#reiniciar-google');

    vincular.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (botonVincular.disabled) return;

        botonVincular.disabled = true;
        const valor = password.value;
        password.value = '';

        try {
            await enviar('/auth/google/vincular', { password: valor });
            location.href = 'dashboard.html';
        } catch (error) {
            msg(error.message);
        } finally {
            botonVincular.disabled = false;
        }
    });

        let procesandoGoogle = false;

    function mostrarBotonGoogle(configuracion) {
        window.google.accounts.id.initialize({
            client_id: configuracion.googleClientId,
            nonce: configuracion.nonce,
            callback: async ({ credential }) => {
                if (procesandoGoogle || botonGoogle.hidden) return;
                procesandoGoogle = true;

                try {
                    const resultado = await enviar('/auth/google', { credential });

                    if (resultado.paso === 'autenticado') {
                        location.href = 'dashboard.html';
                    } else if (resultado.paso === 'confirmar_contrasena') {
                        botonGoogle.hidden = true;
                        formularioManual.hidden = true;
                        vincular.hidden = false;
                        reiniciar.hidden = false;
                        password.focus();
                    }
                } catch (error) {
                    msg(error.message);

                    try {
                        const nuevaConfig = await call('/auth/google/config');
                        mostrarBotonGoogle(nuevaConfig);
                    } catch {
                        reiniciar.hidden = false;
                    }
                } finally {
                    procesandoGoogle = false;
                }
            }
        });

        botonGoogle.replaceChildren();
        window.google.accounts.id.renderButton(botonGoogle, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            locale: 'es'
        });
        reiniciar.hidden = true;
    }

    mostrarBotonGoogle(config);
}