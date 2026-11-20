
/* ==========================================
   FERROMAX - PÁGINA DE CONTACTO
========================================== */

const ICONOS_CONTACTO = {

    telefono: `
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2
                 19.8 19.8 0 0 1-8.6-3.1
                 19.5 19.5 0 0 1-6-6
                 A19.8 19.8 0 0 1 2.1 2
                 2 2 0 0 1 4.1 0h3
                 a2 2 0 0 1 2 1.7
                 c.1 1 .3 2 .7 3
                 a2 2 0 0 1-.5 2.1L8 8.1
                 a16 16 0 0 0 6 6
                 l1.3-1.3a2 2 0 0 1 2.1-.5
                 c1 .4 2 .6 3 .7
                 a2 2 0 0 1 1.6 1.9z"/>
    `,

    ubicacion: `
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10
                 a8 8 0 1 1 16 0z"/>
        <circle cx="12" cy="10" r="2.5"/>
    `,

    correo: `
        <rect x="2" y="4" width="20" height="16" rx="1"/>
        <path d="m2 6 10 7 10-7"/>
    `,

    horario: `
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3.5 2"/>
    `,

    flecha: `
        <path d="M5 12h14"/>
        <path d="m13 6 6 6-6 6"/>
    `

};

const iconoContacto = (nombre) => `
    <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        ${ICONOS_CONTACTO[nombre]}
    </svg>
`;

/* ==========================================
   DATOS DE CONTACTO
========================================== */

const TELEFONO = '3320440073';

const DIRECCION =
    'Av. Las Torres #856, Col. Santa Margarita, ' +
    '1era sección, C.P. 45140, Zapopan, Jalisco.';

const CORREO = 'contacto@ferromax.com';

const HORARIO =
    'Lunes a viernes, de 8:45 a. m. a 5:20 p. m.';

const ENLACE_MAPA =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(DIRECCION);

/* ==========================================
   PÁGINA CONTACTO
========================================== */

export const vistaContacto = () => `

    <div class="fm-contact">

        <!-- ENCABEZADO -->

        <section class="fm-contact-hero">

            <div class="fm-contact-hero-text">

                <span class="fm-contact-eyebrow">
                    ESTAMOS PARA AYUDARTE
                </span>

                <h1>
                    Contacto
                </h1>

                <span class="fm-contact-line"></span>

                <h2>
                    Estamos cerca de ti y
                    de tus próximos proyectos.
                </h2>

                <p>
                    En FerroMax queremos ayudarte a
                    encontrar las herramientas, materiales
                    y accesorios que necesitas para tus
                    proyectos de construcción, reparación
                    y mejoramiento del hogar.
                </p>

                <p>
                    ¿Tienes dudas sobre algún producto,
                    necesitas orientación o deseas conocer
                    nuestra ubicación? Puedes comunicarte
                    con nosotros a través de nuestros
                    medios de contacto.
                </p>

                <div class="fm-contact-actions">

                    <a
                        href="tel:+523320440073"
                        class="fm-contact-button-primary"
                    >
                        ${iconoContacto('telefono')}
                        Llamar ahora
                    </a>

                    <a
                        href="${ENLACE_MAPA}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fm-contact-button-secondary"
                    >
                        Cómo llegar
                        ${iconoContacto('flecha')}
                    </a>

                </div>

            </div>

            <div class="fm-contact-hero-card">

                <span class="fm-contact-card-eyebrow">
                    ATENCIÓN FERROMAX
                </span>

                <div class="fm-contact-hero-icon">
                    ${iconoContacto('telefono')}
                </div>

                <h3>
                    ¿Necesitas ayuda?
                </h3>

                <p>
                    Comunícate con nosotros para resolver
                    tus dudas sobre herramientas, materiales
                    y productos para el hogar.
                </p>

                <a href="tel:+523320440073"
                   class="fm-contact-hero-phone">
                    ${TELEFONO}
                </a>

                <span class="fm-contact-hero-note">
                    Atención durante nuestro horario comercial
                </span>

            </div>

        </section>


        <!-- INFORMACIÓN DE CONTACTO -->

        <section class="fm-contact-information">

            <div class="fm-contact-section-heading">

                <span class="fm-contact-eyebrow">
                    NUESTROS DATOS
                </span>

                <h2>
                    Medios de <span>contacto</span>
                </h2>

                <p>
                    Encuentra la información que necesitas
                    para comunicarte con FerroMax.
                </p>

            </div>

            <div class="fm-contact-grid">

                <!-- TELÉFONO -->

                <article class="fm-contact-info-card">

                    <div class="fm-contact-info-icon">
                        ${iconoContacto('telefono')}
                    </div>

                    <h3>Teléfono</h3>

                    <p>
                        Comunícate con nuestra sucursal
                        para recibir atención.
                    </p>

                    <a href="tel:+523320440073">
                        ${TELEFONO}
                    </a>

                </article>


                <!-- DIRECCIÓN -->

                <article class="fm-contact-info-card">

                    <div class="fm-contact-info-icon">
                        ${iconoContacto('ubicacion')}
                    </div>

                    <h3>Dirección</h3>

                    <p>
                        Visítanos en nuestra sucursal
                        Santa Margarita.
                    </p>

                    <address>
                        ${DIRECCION}
                    </address>

                </article>


                <!-- CORREO -->

                <article class="fm-contact-info-card">

                    <div class="fm-contact-info-icon">
                        ${iconoContacto('correo')}
                    </div>

                    <h3>Correo electrónico</h3>

                    <p>
                        Escríbenos para consultas generales
                        o información sobre nuestros productos.
                    </p>

                    <a href="mailto:${CORREO}">
                        ${CORREO}
                    </a>

                </article>


                <!-- HORARIO -->

                <article class="fm-contact-info-card">

                    <div class="fm-contact-info-icon">
                        ${iconoContacto('horario')}
                    </div>

                    <h3>Horario de atención</h3>

                    <p>
                        Estamos disponibles durante
                        nuestro horario comercial.
                    </p>

                    <strong>
                        ${HORARIO}
                    </strong>

                </article>

            </div>

        </section>


        <!-- UBICACIÓN -->

        <section class="fm-contact-location">

            <div class="fm-contact-section-heading">

                <span class="fm-contact-eyebrow">
                    ENCUÉNTRANOS
                </span>

                <h2>
                    Nuestra <span>ubicación</span>
                </h2>

                <p>
                    Visítanos en nuestra sucursal
                    Santa Margarita, en Zapopan, Jalisco.
                </p>

            </div>

            <div class="fm-contact-location-layout">

                <div class="fm-contact-map">

                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3731.51206698971!2d-103.41451862475155!3d20.730029280845514!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8428af0cb799423b%3A0x3252ea3b6d33465f!2sTODO%20PARA%20EL%20CARPINTERO%20Y%20HERRAJES%20%22MARTINEZ%22!5e0!3m2!1ses-419!2smx!4v1794606716775!5m2!1ses-419!2smx"
                        title="Ubicación de la sucursal"
                        loading="lazy"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen
                    ></iframe>

                </div>

                <div class="fm-contact-location-details">

                    <span class="fm-contact-eyebrow">
                        VISÍTANOS
                    </span>

                    <h3>
                        Sucursal Santa Margarita
                    </h3>

                    <p>
                        Encuentra nuestra ubicación y
                        consulta cómo llegar desde tu
                        punto de partida.
                    </p>

                    <div class="fm-contact-location-item">

                        ${iconoContacto('ubicacion')}

                        <span>
                            ${DIRECCION}
                        </span>

                    </div>

                    <div class="fm-contact-location-item">

                        ${iconoContacto('horario')}

                        <span>
                            ${HORARIO}
                        </span>

                    </div>

                    <a
                        href="${ENLACE_MAPA}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fm-contact-button-primary"
                    >
                        Ver en Google Maps
                        ${iconoContacto('flecha')}
                    </a>

                </div>

            </div>

        </section>

    </div>

`;
