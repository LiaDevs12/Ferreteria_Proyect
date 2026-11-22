import { $, call, msg, me, setMe } from './core.js';
import { iniciarAccesoGoogle } from './acceso-google.js';
/* ==========================================
   AUTENTICACIÓN
========================================== */

export async function guard() {
    setMe(await call('/me'));

    if (!me) {
        location.href = 'login.html';
        return false;
    }

    return true;
}

export async function login() {
    const form = $('#loginForm');

    if (!form) return;

    form.onsubmit = async event => {
        event.preventDefault();

        const button = form.querySelector(
            'button[type="submit"]'
        );

        if (button) {
            button.disabled = true;
        }

        try {
            await call('/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: $('#email').value.trim(),
                    password: $('#password').value
                })
            });

            location.href = 'dashboard.html';

        } catch (error) {
            msg(error.message);

            if (button) {
                button.disabled = false;
            }
        }
    };
        try {
        await iniciarAccesoGoogle(form);
    } catch (error) {
        msg(error.message);
    }
}
