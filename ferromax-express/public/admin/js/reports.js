import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   REPORTES DE INVENTARIO
========================================== */

export async function reports() {
    if (!await guard()) return;

    if (me.rol !== 'ADMINISTRADOR') {
        location.href = 'dashboard.html';
        return;
    }

    const rows = await call('/reports');

    layout('Reportes de inventario', 'reports', `

        <h1>Reportes de inventario</h1>

        <p class="sub">
            Incidencias registradas desde
            la aplicación móvil.
        </p>

        <div id="msg" class="notice hidden"></div>

        <section class="panel">

            <div class="table-wrap">

                <table>

                    <thead>
                        <tr>
                            <th>Folio</th>
                            <th>Fecha</th>
                            <th>Empleado</th>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Prioridad</th>
                            <th>Estado</th>
                            <th>Ver</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${rows.map(report => `

                            <tr>

                                <td>
                                    #${esc(report.id)}
                                </td>

                                <td>
                                    ${
                                        report.fecha
                                            ? new Date(
                                                report.fecha
                                            ).toLocaleString('es-MX')
                                            : 'Sin fecha'
                                    }
                                </td>

                                <td>
                                    ${esc(report.empleado)}
                                </td>

                                <td>
                                    ${esc(
                                        report.producto ||
                                        'No especificado'
                                    )}
                                </td>

                                <td>
                                    ${esc(report.tipo)}
                                </td>

                                <td>
                                    ${esc(report.prioridad)}
                                </td>

                                <td>
                                    <span class="pill">
                                        ${esc(report.estado)}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        class="btn light"
                                        type="button"
                                        data-report="${esc(report.id)}"
                                    >
                                        Abrir
                                    </button>
                                </td>

                            </tr>

                        `).join('') || `

                            <tr>
                                <td colspan="8">
                                    No hay reportes registrados.
                                </td>
                            </tr>

                        `}

                    </tbody>

                </table>

            </div>

        </section>

        <section
            id="detail"
            class="panel hidden"
        ></section>
    `);

    document.querySelectorAll(
        '[data-report]'
    ).forEach(button => {
        button.onclick = async () => {
            try {
                const report = await call(
                    '/reports/' + button.dataset.report
                );

                const detail = $('#detail');

                detail.classList.remove('hidden');

                detail.innerHTML = `

                    <h2>
                        Reporte #${esc(report.id_incidencia)}
                    </h2>

                    <div class="form-grid">

                        <div>
                            <b>Empleado:</b>
                            ${esc(report.empleado)}
                        </div>

                        <div>
                            <b>Producto:</b>
                            ${esc(
                                report.producto ||
                                'No especificado'
                            )}
                        </div>

                        <div>
                            <b>Tipo:</b>
                            ${esc(report.tipo_incidencia)}
                        </div>

                        <div>
                            <b>Prioridad:</b>
                            ${esc(report.prioridad)}
                        </div>

                        <div>
                            <b>Cantidad en sistema:</b>
                            ${report.cantidad_sistema ?? 'N/D'}
                        </div>

                        <div>
                            <b>Cantidad contada:</b>
                            ${report.cantidad_contada ?? 'N/D'}
                        </div>

                        <div class="field full">
                            <b>Descripción:</b>

                            <p>
                                ${esc(report.descripcion)}
                            </p>
                        </div>

                        ${(report.evidencias || []).map(photo => `

                            <div class="field full">

                                <img
                                    class="report-photo"
                                    src="${esc(photo.url_foto)}"
                                    alt="Evidencia del reporte"
                                >

                            </div>

                        `).join('')}

                    </div>

                    <div
                        class="form-grid"
                        style="margin-top:20px"
                    >

                        <div class="field">

                            <label>Estado</label>

                            <select id="estado">

                                ${[
                                    'PENDIENTE',
                                    'EN_REVISION',
                                    'RESUELTA',
                                    'RECHAZADA'
                                ].map(state => `

                                    <option
                                        value="${state}"
                                        ${
                                            report.estado === state
                                                ? 'selected'
                                                : ''
                                        }
                                    >
                                        ${state}
                                    </option>

                                `).join('')}

                            </select>

                        </div>

                        <div class="field">

                            <label>
                                Solución / observaciones administrativas
                            </label>

                            <textarea id="solucion">${
                                esc(report.solucion || '')
                            }</textarea>

                        </div>

                    </div>

                    <div
                        class="actions"
                        style="margin-top:15px"
                    >

                        <button
                            id="saveReport"
                            class="btn"
                            type="button"
                        >
                            Guardar seguimiento
                        </button>

                        <button
                            id="pdfReport"
                            class="btn light"
                            type="button"
                        >
                            Descargar PDF
                        </button>

                    </div>
                `;

                $('#saveReport').onclick = async () => {
                    try {
                        await call(
                            '/reports/' +
                            report.id_incidencia,
                            {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    estado: $('#estado').value,
                                    solucion: $('#solucion').value
                                })
                            }
                        );

                        msg('Reporte actualizado.');

                    } catch (error) {
                        msg(error.message);
                    }
                };

                $('#pdfReport').onclick = () => {
                    window.open(
                        API +
                        '/reports/' +
                        report.id_incidencia +
                        '/pdf',
                        '_blank'
                    );
                };

                detail.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

            } catch (error) {
                msg(error.message);
            }
        };
    });
}
