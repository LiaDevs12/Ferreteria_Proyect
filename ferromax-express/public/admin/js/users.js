import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   USUARIOS Y ROLES
========================================== */

export async function users() {
    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const rows = await call('/users');

    layout('Usuarios y roles', 'users', `

        <h1>Usuarios y roles</h1>

        <p class="sub">
            Crea usuarios para tu equipo
            y administra sus permisos.
        </p>

        <div id="msg" class="notice hidden"></div>

        <section class="panel">

            <h2>Agregar persona</h2>

            <form id="userForm" class="form-grid">

                <div class="field">
                    <label>Nombre</label>
                    <input id="nombre" required>
                </div>

                <div class="field">
                    <label>Apellido paterno</label>
                    <input id="ap" required>
                </div>

                <div class="field">
                    <label>Apellido materno</label>
                    <input id="am">
                </div>

                <div class="field">
                    <label>Correo</label>
                    <input
                        id="correo"
                        type="email"
                        required
                    >
                </div>

                <div class="field">
                    <label>Contraseña inicial</label>

                    <input
                        id="pass"
                        type="password"
                        minlength="8"
                        required
                    >
                </div>

                <div class="field">
                    <label>Rol</label>

                    <select id="rol">
                        <option value="EDITOR">
                            Editor
                        </option>

                        <option value="INVENTARIO">
                            Inventario
                        </option>

                        <option value="ADMINISTRADOR">
                            Administrador
                        </option>
                    </select>
                </div>

                <div class="field full">
                    <button class="btn">
                        Crear usuario
                    </button>
                </div>

            </form>

        </section>

        <section class="panel">

            <h2>Personal registrado</h2>

            <div class="table-wrap">

                <table>

                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${rows.map(user => `

                            <tr>

                                <td>
                                    ${esc(user.nombre)}
                                    ${esc(user.apellido_paterno)}
                                </td>

                                <td>
                                    ${esc(user.correo)}
                                </td>

                                <td>

                                    <select
                                        data-role="${esc(user.id)}"
                                    >

                                        ${[
                                            'ADMINISTRADOR',
                                            'EDITOR',
                                            'INVENTARIO'
                                        ].map(role => `

                                            <option
                                                value="${role}"
                                                ${
                                                    user.rol === role
                                                        ? 'selected'
                                                        : ''
                                                }
                                            >
                                                ${role}
                                            </option>

                                        `).join('')}

                                    </select>

                                </td>

                                <td>
                                    ${
                                        Number(user.activo) === 1
                                            ? 'Activo'
                                            : 'Desactivado'
                                    }
                                </td>

                                <td>
                                    <button
                                        class="btn light"
                                        type="button"
                                        data-toggle="${esc(user.id)}"
                                    >
                                        ${
                                            Number(user.activo) === 1
                                                ? 'Desactivar'
                                                : 'Activar'
                                        }
                                    </button>
                                </td>

                            </tr>

                        `).join('')}

                    </tbody>

                </table>

            </div>

        </section>
    `);

    $('#userForm').onsubmit = async event => {
        event.preventDefault();

        try {
            await call('/users', {
                method: 'POST',
                body: JSON.stringify({
                    nombre: $('#nombre').value,
                    apellido_paterno: $('#ap').value,
                    apellido_materno: $('#am').value,
                    correo: $('#correo').value,
                    password: $('#pass').value,
                    rol: $('#rol').value
                })
            });

            location.reload();

        } catch (error) {
            msg(error.message);
        }
    };

    document.querySelectorAll(
        '[data-toggle]'
    ).forEach(button => {
        button.onclick = async () => {
            const user = rows.find(u =>
                String(u.id) === button.dataset.toggle
            );

            if (!user) return;

            try {
                await call('/users/' + user.id, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        nombre: user.nombre,
                        apellido_paterno: user.apellido_paterno,
                        apellido_materno: user.apellido_materno,
                        rol: $(
                            `[data-role="${user.id}"]`
                        ).value,
                        activo: Number(user.activo) !== 1
                    })
                });

                location.reload();

            } catch (error) {
                msg(error.message);
            }
        };
    });
}
