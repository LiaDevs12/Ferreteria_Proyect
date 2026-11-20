import { $, esc, money, call, msg, imgData, svgIcon, me } from './core.js';
import { guard } from './auth.js';
import { layout } from './layout.js';

/* ==========================================
   DASHBOARD
========================================== */

export async function dashboard() {
    if (!await guard()) return;

    const d = await call('/dashboard');

    const top = d.topProducts || [];
    const recent = d.recent || [];
    const hours = d.salesByHour || [];

    const hourMap = new Map(
        hours.map(h => [
            Number(h.hora),
            Number(h.total)
        ])
    );

    const hourly = Array.from(
        { length: 24 },
        (_, hour) => ({
            hour,
            total: hourMap.get(hour) || 0
        })
    );

    const maxHourly = Math.max(
        1,
        ...hourly.map(h => h.total)
    );

    const maxUnits = Math.max(
        1,
        ...top.map(p => Number(p.unidades))
    );

    const firstProduct = top[0] || null;

    const stat = (
        label,
        value,
        description,
        icon = 'products'
    ) => `
        <article class="fm-stat-card">

            <div class="fm-stat-top">
                <span>${label}</span>

                <div class="fm-stat-icon">
                    ${svgIcon(icon)}
                </div>
            </div>

            <strong>${value}</strong>

            <small>${description}</small>

        </article>
    `;

    layout('Dashboard', 'home', `
        <div class="fm-dashboard">

            <div class="fm-heading">

                <div>
                    <span class="fm-eyebrow">
                        CENTRO DE OPERACIONES
                    </span>

                    <h1>
                        Bienvenido, ${esc(me.nombre)}
                    </h1>

                    <p class="sub">
                        Consulta los pedidos, productos,
                        reportes y estado del inventario.
                    </p>
                </div>

                <div class="fm-date">
                    ${new Date().toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })}
                </div>

            </div>

            <div class="fm-stats">

                ${stat(
                    'Importe de pedidos hoy',
                    money(d.today?.amount),
                    'Pedidos registrados, sin confirmar cobro',
                    'sales'
                )}

                ${stat(
                    'Pedidos del día',
                    Number(d.today?.orders || 0),
                    'Registrados durante el día',
                    'sales'
                )}

                ${stat(
                    'Productos activos',
                    Number(d.products || 0),
                    'Disponibles en el catálogo web',
                    'products'
                )}

                ${stat(
                    'Sin existencias',
                    Number(d.outOfStock || 0),
                    'Productos sin stock',
                    'alert'
                )}

            </div>

            <div class="fm-dashboard-grid">

                <section class="fm-widget fm-sales-widget">

                    <div class="fm-widget-header">

                        <div>
                            <span class="fm-widget-kicker">
                                ACTIVIDAD COMERCIAL
                            </span>

                            <h2>
                                Importe de pedidos por hora
                            </h2>
                        </div>

                    </div>

                    <p class="fm-widget-description">
                        Importe registrado hoy,
                        en pesos mexicanos.
                    </p>

                    <div class="fm-chart">

                        ${hourly.map(h => `
                            <div
                                class="fm-chart-column"
                                title="${
                                    String(h.hour).padStart(2, '0')
                                }:00 — ${money(h.total)}"
                            >

                                <div class="fm-chart-bar-track">

                                    <div
                                        class="fm-chart-bar"
                                        style="height:${
                                            h.total > 0
                                                ? Math.max(
                                                    5,
                                                    h.total / maxHourly * 100
                                                )
                                                : 0
                                        }%"
                                    ></div>

                                </div>

                                <span>
                                    ${
                                        h.hour % 4 === 0
                                            ? String(h.hour)
                                                .padStart(2, '0')
                                            : ''
                                    }
                                </span>

                            </div>
                        `).join('')}

                    </div>

                    <div class="fm-chart-footer">
                        <span>00:00</span>
                        <span>Hora del pedido</span>
                        <span>23:00</span>
                    </div>

                </section>

                <section class="fm-widget fm-top-widget">

                    <div class="fm-widget-header">

                        <div>
                            <span class="fm-widget-kicker">
                                PRODUCTOS DESTACADOS
                            </span>

                            <h2>
                                Producto más solicitado
                            </h2>
                        </div>

                    </div>

                    ${firstProduct ? `

                        <div class="fm-top-product">

                            <span class="fm-top-label">
                                PRODUCTO N.º 1
                            </span>

                            <h3>
                                ${esc(firstProduct.nombre)}
                            </h3>

                            <p>
                                SKU: ${esc(firstProduct.sku)}
                            </p>

                            <strong>
                                ${Number(
                                    firstProduct.unidades
                                ).toLocaleString('es-MX')}
                            </strong>

                            <span>
                                Unidades solicitadas
                            </span>

                            <div class="fm-top-total">
                                Importe acumulado:

                                <b>
                                    ${money(firstProduct.importe)}
                                </b>
                            </div>

                        </div>

                    ` : `

                        <p class="fm-empty">
                            Todavía no hay productos registrados
                            en pedidos.
                        </p>

                    `}

                </section>

                <section class="fm-widget fm-ranking-widget">

                    <div class="fm-widget-header">

                        <div>
                            <span class="fm-widget-kicker">
                                CLASIFICACIÓN
                            </span>

                            <h2>
                                Productos más solicitados
                            </h2>
                        </div>

                    </div>

                    ${top.length ? top.map((p, index) => `

                        <div class="fm-ranking-row">

                            <span class="fm-ranking-number">
                                ${String(index + 1).padStart(2, '0')}
                            </span>

                            <div class="fm-ranking-info">

                                <div class="fm-ranking-title">

                                    <span>
                                        ${esc(p.nombre)}
                                    </span>

                                    <b>
                                        ${Number(
                                            p.unidades
                                        ).toLocaleString('es-MX')}
                                    </b>

                                </div>

                                <div class="fm-progress">

                                    <div
                                        style="width:${
                                            Number(p.unidades) /
                                            maxUnits * 100
                                        }%"
                                    ></div>

                                </div>

                            </div>

                        </div>

                    `).join('') : `

                        <p class="fm-empty">
                            No hay productos para mostrar.
                        </p>

                    `}

                </section>

                <section class="fm-widget fm-alert-widget">

                    <div class="fm-widget-header">

                        <div>
                            <span class="fm-widget-kicker">
                                INVENTARIO
                            </span>

                            <h2>
                                Estado de operaciones
                            </h2>
                        </div>

                    </div>

                    <div class="fm-status-row">
                        <span>Reportes pendientes</span>
                        <strong>
                            ${Number(d.pendingReports || 0)}
                        </strong>
                    </div>

                    <div class="fm-status-row">
                        <span>Personal activo</span>
                        <strong>
                            ${Number(d.staff || 0)}
                        </strong>
                    </div>

                    <div class="fm-status-row">
                        <span>Productos sin existencia</span>
                        <strong>
                            ${Number(d.outOfStock || 0)}
                        </strong>
                    </div>

                    <div class="fm-shortcuts">

                        ${[
                            'ADMINISTRADOR',
                            'EDITOR'
                        ].includes(me.rol) ? `

                            <a href="productos.html">
                                Gestionar productos
                            </a>

                        ` : ''}

                        ${me.rol === 'ADMINISTRADOR' ? `

                            <a href="reportes.html">
                                Ver reportes
                            </a>

                        ` : ''}

                        <a href="perfil.html">
                            Mi perfil
                        </a>

                    </div>

                </section>

            </div>

            <section class="fm-widget fm-recent-widget">

                <div class="fm-widget-header">

                    <div>
                        <span class="fm-widget-kicker">
                            SEGUIMIENTO
                        </span>

                        <h2>
                            Reportes recientes de inventario
                        </h2>
                    </div>

                </div>

                <div class="table-wrap">

                    <table>

                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Tipo</th>
                                <th>Empleado</th>
                                <th>Prioridad</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${recent.map(r => `

                                <tr>
                                    <td>#${esc(r.id)}</td>
                                    <td>${esc(r.tipo)}</td>
                                    <td>${esc(r.empleado)}</td>
                                    <td>${esc(r.prioridad)}</td>

                                    <td>
                                        <span class="pill">
                                            ${esc(r.estado)}
                                        </span>
                                    </td>
                                </tr>

                            `).join('') || `

                                <tr>
                                    <td colspan="5">
                                        No hay reportes recientes.
                                    </td>
                                </tr>

                            `}

                        </tbody>

                    </table>

                </div>

            </section>

            <p class="fm-data-note">
                Los importes corresponden a pedidos registrados.
                El sistema todavía no confirma pagos reales.
            </p>

        </div>
    `);
}
