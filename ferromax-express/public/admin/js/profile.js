import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   MI PERFIL
========================================== */

export async function profile() {
    if (!await guard()) return;

    layout('Mi perfil', 'profile', `

        <h1>Mi perfil</h1>

        <p class="sub">
            Actualiza tu información personal
            y la seguridad de tu cuenta.
        </p>

        <div id="msg" class="notice hidden"></div>

        <section class="panel">

            <h2>Información personal</h2>

            <form id="profileForm" class="form-grid">

                <div class="field">

                    <label>Nombre</label>

                    <input
                        id="nombre"
                        value="${esc(me.nombre)}"
                        required
                    >

                </div>

                <div class="field">

                    <label>Apellido paterno</label>

                    <input
                        id="ap"
                        value="${esc(me.apellido_paterno)}"
                        required
                    >

                </div>

                <div class="field">

                    <label>Apellido materno</label>

                    <input
                        id="am"
                        value="${esc(me.apellido_materno)}"
                    >

                </div>

                <div class="field">

                    <label>Correo (no editable)</label>

                    <input
                        value="${esc(me.correo)}"
                        disabled
                    >

                </div>

                <div class="field full">

                    <label>
                        Fotografía de perfil (máximo 5 MB)
                    </label>

                    <input
                        id="foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                    >

                </div>

                <div class="field full">
                    <button class="btn">
                        Guardar perfil
                    </button>
                </div>

            </form>

        </section>

        <section class="panel">

            <h2>Cambiar contraseña</h2>

            <form id="passForm" class="form-grid">

                <div class="field">

                    <label>
                        Contraseña actual
                    </label>

                    <input
                        id="actual"
                        type="password"
                        required
                    >

                </div>

                <div class="field">

                    <label>
                        Nueva contraseña
                    </label>

                    <input
                        id="nueva"
                        type="password"
                        minlength="8"
                        required
                    >

                </div>

                <div class="field full">
                    <button class="btn">
                        Actualizar contraseña
                    </button>
                </div>

            </form>

        </section>

        <button
            id="logout"
            class="btn light"
            type="button"
        >
            Cerrar sesión
        </button>
    `);

    $('#profileForm').onsubmit = async event => {
        event.preventDefault();

        try {
            await call('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    nombre: $('#nombre').value,
                    apellido_paterno: $('#ap').value,
                    apellido_materno: $('#am').value,

                    foto_perfil:
                        await imgData(
                            $('#foto').files[0]
                        ) || undefined
                })
            });

            location.reload();

        } catch (error) {
            msg(error.message);
        }
    };

    $('#passForm').onsubmit = async event => {
        event.preventDefault();

        try {
            await call('/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    actual: $('#actual').value,
                    nueva: $('#nueva').value
                })
            });

            $('#passForm').reset();

            msg('Contraseña actualizada.');

        } catch (error) {
            msg(error.message);
        }
    };

    $('#logout').onclick = async () => {
        try {
            await call('/logout', {
                method: 'POST'
            });

            location.href = 'login.html';

        } catch (error) {
            msg(error.message);
        }
    };
}
