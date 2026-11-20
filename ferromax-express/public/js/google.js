import { $, api, setUser } from './core.js';
import { render } from './navegacion.js';

/* ==========================================
   INICIO DE SESIÓN CON GOOGLE
========================================== */

const loadGsi = () => new Promise(
    (resolve, reject) => {
        if (window.google?.accounts) {
            return resolve();
        }

        const script = document.createElement('script');

        script.src =
            'https://accounts.google.com/gsi/client';

        script.onload = resolve;

        script.onerror = () => reject(
            new Error('No se pudo cargar Google')
        );

        document.head.append(script);
    }
);

export async function initGoogle(id) {
    try {
        await loadGsi();

        google.accounts.id.initialize({
            client_id: id,

            callback: async r => {
                try {
                    const nuevoUsuario = await api('/auth/google', {
                        method: 'POST',
                        body: {
                            credential: r.credential
                        }
                    });

                    setUser(nuevoUsuario);
                    render();

                } catch (e) {
                    if ($('#ae')) {
                        $('#ae').textContent = e.message;
                    }
                }
            }
        });

        google.accounts.id.renderButton(
            $('#gbtn'),
            {
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                locale: 'es'
            }
        );

    } catch (e) {
        if ($('#ae')) {
            $('#ae').textContent = e.message;
        }
    }
}
