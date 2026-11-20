/* ==========================================
   FERROMAX
   PANEL ADMINISTRATIVO
   INICIO Y DESCARGA DE REPORTES PDF
========================================== */

(function () {

    'use strict';

    let iniciado = false;

    const abrirVentana =
        window.open.bind(window);


    /* ======================================
       IDENTIFICAR RUTA PDF
    ====================================== */

    function identificarURLPDF(url) {

        try {

            const destino = new URL(
                String(url),
                location.href
            );

            if (
                destino.origin !==
                location.origin
            ) {
                return null;
            }

            const coincidencia =
                destino.pathname.match(
                    /^\/api\/admin\/reports\/([1-9]\d*)\/pdf\/?$/
                );

            return coincidencia
                ? {
                    id: Number(coincidencia[1]),
                    url: destino.href
                }
                : null;

        } catch {

            return null;

        }
    }


    /* ======================================
       OBTENER FOLIO DEL REPORTE
    ====================================== */

    function obtenerFolio(boton) {

        const datos = [

            boton.dataset.reportId,

            boton.dataset.id,

            boton.closest(
                '#detail, #reportDetail, .report-detail'
            )?.querySelector('h2')?.textContent,

            document.querySelector(
                '#detail h2'
            )?.textContent,

            document.querySelector(
                '#reportDetail h2'
            )?.textContent

        ];

        for (const dato of datos) {

            if (!dato) continue;

            const numero = String(dato).match(
                /(?:reporte\s*#?|#)?\s*(\d+)/i
            );

            if (!numero) continue;

            const id = Number(numero[1]);

            if (
                Number.isSafeInteger(id) &&
                id > 0
            ) {
                return id;
            }
        }

        return null;
    }


    /* ======================================
       DESCARGAR PDF
    ====================================== */

    async function descargarPDF(id, url = null) {

        const boton = document.querySelector(
            '#pdfReport'
        );

        const etiqueta =
            boton?.textContent || '';

        if (boton) {

            boton.disabled = true;

            boton.textContent =
                'Descargando PDF...';
        }

        try {

            if (
                !Number.isSafeInteger(Number(id)) ||
                Number(id) <= 0
            ) {
                throw new Error(
                    'Folio de reporte inválido.'
                );
            }

            /* ==============================
               SOLICITUD AL SERVIDOR
            ============================== */

            const ruta = url ||
                `/api/admin/reports/${id}/pdf`;

            const respuesta = await fetch(
                ruta,
                {
                    method: 'GET',

                    credentials: 'same-origin',

                    headers: {
                        Accept: 'application/pdf'
                    },

                    cache: 'no-store'
                }
            );


            /* ==============================
               COMPROBAR RESPUESTA
            ============================== */

            if (!respuesta.ok) {

                const datos = await respuesta
                    .json()
                    .catch(() => null);

                throw new Error(
                    datos?.error ||
                    `Error HTTP ${respuesta.status}`
                );
            }


            /* ==============================
               VERIFICAR ARCHIVO PDF
            ============================== */

            const tipo = respuesta.headers.get(
                'Content-Type'
            ) || '';

            if (
                !tipo.toLowerCase()
                    .includes('application/pdf')
            ) {

                throw new Error(
                    'El servidor no devolvió un PDF. ' +
                    'Comprueba la ruta y la sesión.'
                );
            }

            const archivo = await respuesta.blob();

            if (
                !archivo.size ||
                await archivo
                    .slice(0, 5)
                    .text() !== '%PDF-'
            ) {

                throw new Error(
                    'El documento recibido está vacío ' +
                    'o no es un PDF.'
                );
            }


            /* ==============================
               DESCARGAR EN COMPUTADORA
            ============================== */

            const temporal =
                URL.createObjectURL(archivo);

            const enlace =
                document.createElement('a');

            enlace.href = temporal;

            enlace.download =
                `FerroMax-reporte-${id}.pdf`;

            enlace.style.display = 'none';

            document.body.appendChild(enlace);

            enlace.click();

            enlace.remove();


            /* ==============================
               LIBERAR MEMORIA
            ============================== */

            setTimeout(() => {

                URL.revokeObjectURL(temporal);

            }, 30000);

            console.log(
                'Descarga PDF iniciada:',
                id
            );

        } catch (error) {

            console.error(
                'No se pudo descargar el PDF:',
                error
            );

            alert(
                'No se pudo descargar el PDF:\n\n' +
                error.message
            );

        } finally {

            if (boton) {

                boton.disabled = false;

                boton.textContent = etiqueta;
            }
        }
    }


    /* ======================================
       CAPTURAR CLIC EN DESCARGAR PDF
    ====================================== */

    document.addEventListener(
        'click',
        event => {

            const boton = event.target
                ?.closest?.('#pdfReport');

            if (!boton) {
                return;
            }

            const id = obtenerFolio(boton);

            if (!id) {
                return;
            }

            /* ==============================
               EVITAR EVENTOS DUPLICADOS
            ============================== */

            event.preventDefault();

            event.stopImmediatePropagation();


            /* ==============================
               INICIAR DESCARGA
            ============================== */

            void descargarPDF(id);

        },
        true
    );


    /* ======================================
       COMPATIBILIDAD CON WINDOW.OPEN
    ====================================== */

    window.open = function (
        url,
        target,
        features
    ) {

        const pdf = identificarURLPDF(url);

        if (pdf) {

            void descargarPDF(
                pdf.id,
                pdf.url
            );

            return null;
        }

        return abrirVentana(
            url,
            target,
            features
        );
    };


    /* ======================================
       MOSTRAR ERRORES DE INICIO
    ====================================== */

    function mostrarError(error) {

        console.error(
            'Error al iniciar el panel administrativo de FerroMax:',
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
                    max-width: 450px;
                    width: 100%;
                    padding: 35px;
                    background: white;
                    box-shadow: 0 10px 35px rgba(0,0,0,.08);
                    text-align: center;
                ">

                    <h1 style="
                        color: #c8102e;
                    ">
                        FERROMAX
                    </h1>

                    <h2>
                        No se pudo cargar el panel
                    </h2>

                    <p style="
                        color: #666;
                        line-height: 1.7;
                    ">
                        Revisa la consola del navegador
                        presionando F12.
                    </p>

                    <button
                        type="button"
                        onclick="location.reload()"
                        style="
                            background: #c8102e;
                            color: white;
                            border: 0;
                            padding: 13px 25px;
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
       INICIAR PANEL ADMINISTRATIVO
    ====================================== */

    async function iniciar() {

        if (iniciado) {
            return;
        }

        iniciado = true;

        try {

            await import('./js/main.js');

        } catch (error) {

            mostrarError(error);
        }
    }


    /* ======================================
       ESPERAR CARGA DEL DOCUMENTO
    ====================================== */

    if (
        document.readyState === 'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            iniciar,
            { once: true }
        );

    } else {

        void iniciar();
    }

})();