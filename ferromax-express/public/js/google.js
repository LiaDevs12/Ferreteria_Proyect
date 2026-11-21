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
    const googleButton = $('#gbtn');
    const linkForm = $('#google-link-form');
    const passwordInput = $('#google-link-password');
    const linkButton = linkForm.querySelector('button');
    const message = $('#ae');
    let credential;
    let signingIn = false;

    async function signIn(body) {
        signingIn = true;
        message.textContent = '';

        try {
            const user = await api('/auth/google', { method: 'POST', body });
            credential = undefined;
            setUser(user);
            render();
        } catch (error) {
            message.textContent = error.message;

            if (error.code === 'GOOGLE_LINK_REQUIRED') {
                credential = body.credential;
                linkForm.hidden = false;
                passwordInput.focus();
            }
        } finally {
            signingIn = false;
        }
    }

    linkForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!credential || signingIn) return;

        linkButton.disabled = true;
        try {
            const password = passwordInput.value;
            passwordInput.value = '';
            await signIn({ credential, password });
        } finally {
            linkButton.disabled = false;
        }
    });

    try {
        await loadGsi();
        if (!googleButton.isConnected) return;

        google.accounts.id.initialize({
            client_id: id,
            callback: response => {
                if (!googleButton.isConnected || signingIn) return;
                credential = undefined;
                linkForm.hidden = true;
                return signIn({ credential: response.credential });
            }
        });

        google.accounts.id.renderButton(googleButton, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            locale: 'es'
        });
    } catch (error) {
        message.textContent = error.message;
    }
}