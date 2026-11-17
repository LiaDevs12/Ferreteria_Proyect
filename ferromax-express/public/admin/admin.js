
/* ==========================================
   FERROMAX
   PANEL ADMINISTRATIVO
   ARCHIVO PRINCIPAL DE INICIO
========================================== */

(function () {

    'use strict';

    let iniciado = false;

    /* ======================================
       MOSTRAR ERRORES DE INICIO
    ====================================== */

    function mostrarError(error) {

        console.error(
            'Error al iniciar el panel administrativo de FerreMax:',
            error
        );

        document.body.innerHTML = `
            <div style="
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f8f5f5;
                font-family: Arial, sans-serif;
                padding: 24px;
            ">
                <div style="
                    width: 100%;
                    max-width: 450px;
                    padding: 35px;
                    border-radius: 15px;
                    background: white;
                    box-shadow: 0 10px 35px rgba(0,0,0,.08);
                    text-align: center;
                ">

                    <h1 style="
                        color: #c8102e;
                        margin-bottom: 12px;
                    ">
                        FERROMAX
                    </h1>

                    <h2 style="
                        color: #292929;
                        font-size: 20px;
                        margin-bottom: 15px;
                    ">
                        No se pudo cargar el panel
                    </h2>

                    <p style="
                        color: #666;
                        line-height: 1.7;
                        font-size: 14px;
                    ">
                        Ocurrió un error al iniciar el
                        sistema administrativo.
                        Revisa la consola del navegador
                        presionando F12.
                    </p>

                    <button
                        type="button"
                        onclick="location.reload()"
                        style="
                            margin-top: 20px;
                            background: #c8102e;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 13px 25px;
                            font-weight: bold;
                            cursor: pointer;
                        "
                    >
                        Reintentar
                    </button>

                </div>
            </div>
        `;
    }

    /* ======================================
       INICIAR EL PANEL ADMINISTRATIVO
    ====================================== */

    async function iniciar() {

        if (iniciado) return;

        iniciado = true;

        try {

            await import('./js/main.js');

        } catch (error) {

            mostrarError(error);

        }
    }

    /* ======================================
       ESPERAR A QUE CARGUE EL DOCUMENTO
    ====================================== */

    if (document.readyState === 'loading') {

        document.addEventListener(
            'DOMContentLoaded',
            iniciar,
            { once: true }
        );

    } else {

        iniciar();

    }

})();
