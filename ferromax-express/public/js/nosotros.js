
/* ==========================================
   FERROMAX - PÁGINA NOSOTROS
========================================== */

/* ==========================================
   ICONOS DE VALORES
========================================== */

const iconos = {

    calidad: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l3 2 4 .5.5 4 2.5 3.5
                     -2.5 3.5-.5 4-4 .5-3 2-3-2
                     -4-.5-.5-4L2 12l2.5-3.5.5-4L9 4z"/>
            <path d="m8.5 12 2.5 2.5 4.5-5"/>
        </svg>
    `,

    honestidad: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v18M5 7h14"/>
            <path d="M5 7l-3 6h6L5 7z"/>
            <path d="M19 7l-3 6h6l-3-6z"/>
            <path d="M8 21h8"/>
        </svg>
    `,

    compromiso: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12
                     5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8
                     7.8L12 21l8.8-8.6a5.5 5.5
                     0 0 0 0-7.8z"/>
        </svg>
    `,

    servicio: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14v-2a8 8 0 0 1 16 0v2"/>
            <rect x="2" y="13" width="5" height="7" rx="1"/>
            <rect x="17" y="13" width="5" height="7" rx="1"/>
            <path d="M19 20c0 2-3 2-7 2"/>
        </svg>
    `,

    responsabilidad: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 4c-8 0-14 3-14 10
                     a6 6 0 0 0 6 6c7 0 10-6 8-16z"/>
            <path d="M4 22c2-5 6-9 12-12"/>
        </svg>
    `,

    innovacion: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18h6M10 22h4"/>
            <path d="M8 15a7 7 0 1 1 8 0
                     c-1 1-1 2-1 3H9c0-1 0-2-1-3z"/>
            <path d="M12 6v2M7 10l1 1M17 10l-1 1"/>
        </svg>
    `

};


/* ==========================================
   INFORMACIÓN DE LOS VALORES
========================================== */

const valores = [

    {
        titulo: 'Calidad',
        icono: 'calidad',
        descripcion:
            'Buscamos ofrecer herramientas y materiales confiables que contribuyan a realizar trabajos resistentes, funcionales y duraderos.'
    },

    {
        titulo: 'Honestidad',
        icono: 'honestidad',
        descripcion:
            'Creemos en la transparencia, la confianza y la comunicación clara con nuestros clientes, colaboradores y proveedores.'
    },

    {
        titulo: 'Compromiso',
        icono: 'compromiso',
        descripcion:
            'Nos esforzamos por atender las necesidades de cada cliente y acompañarlo en la realización de sus proyectos.'
    },

    {
        titulo: 'Servicio',
        icono: 'servicio',
        descripcion:
            'Promovemos una atención cercana, respetuosa y orientada a facilitar la elección de los productos adecuados.'
    },

    {
        titulo: 'Responsabilidad',
        icono: 'responsabilidad',
        descripcion:
            'Actuamos con respeto hacia las personas, los recursos y nuestro entorno, fomentando prácticas responsables.'
    },

    {
        titulo: 'Innovación',
        icono: 'innovacion',
        descripcion:
            'Buscamos mejorar continuamente nuestros procesos y aprovechar la tecnología para ofrecer una experiencia de compra más sencilla.'
    }

];


/* ==========================================
   COMPONENTE DE FOTOGRAFÍA
========================================== */

const fotoNosotros = (ruta, alt, etiqueta) => `

    <div class="fm-about-photo">

        <div class="fm-about-photo-placeholder">
            <span>${etiqueta}</span>
        </div>

        <img
            src="${ruta}"
            alt="${alt}"
            loading="lazy"
            onerror="this.remove()"
        >

    </div>

`;


/* ==========================================
   PÁGINA NOSOTROS
========================================== */

export const vistaNosotros = () => `

    <div class="fm-about">

        <!-- ==================================
             SECCIÓN NOSOTROS
        ================================== -->

        <section class="fm-about-intro">

            <div class="fm-about-intro-text">

                <span class="fm-about-eyebrow">
                    CONOCE FERROMAX
                </span>

                <h1 class="fm-about-title">
                    Nosotros
                </h1>

                <span class="fm-about-line"></span>

                <p class="fm-about-lead">
                    En <strong>FerroMax</strong> creemos que
                    cada gran proyecto comienza con una
                    buena idea y las herramientas adecuadas
                    para hacerla realidad.
                </p>

                <p>
                    Somos una ferretería enfocada en brindar
                    soluciones prácticas para la construcción,
                    reparación, mantenimiento y mejoramiento
                    de espacios. Nuestro propósito es acercar
                    herramientas, materiales y accesorios que
                    respondan a las necesidades del hogar,
                    el taller y la obra.
                </p>

                <p>
                    Queremos ser un aliado para profesionales,
                    trabajadores y personas que disfrutan
                    realizar sus propios proyectos.
                    Por eso, buscamos combinar variedad de
                    productos, atención cercana y una
                    experiencia de compra accesible,
                    confiable y moderna.
                </p>

            </div>

            ${fotoNosotros(
                '/img/Nosotros1.jpg',
                'FerroMax, herramientas y materiales para tus proyectos',
                'Nosotros 1.jpg'
            )}

        </section>


        <!-- ==================================
             SECCIÓN VISIÓN
        ================================== -->

        <section class="fm-about-split fm-about-vision">

            <div class="fm-about-text">

                <span class="fm-about-eyebrow">
                    HACIA DÓNDE QUEREMOS LLEGAR
                </span>

                <h2>
                    Nuestra <span>Visión</span>
                </h2>

                <span class="fm-about-line"></span>

                <p class="fm-about-lead">
                    Ser una ferretería reconocida por su
                    confianza, calidad y cercanía con
                    los clientes.
                </p>

                <p>
                    Aspiramos a convertirnos en una opción
                    de referencia para quienes buscan
                    herramientas, materiales y soluciones
                    para sus proyectos, destacándonos por
                    nuestro compromiso con el servicio,
                    la variedad de productos y la mejora
                    continua.
                </p>

                <p>
                    Buscamos crecer de manera responsable,
                    incorporando nuevas tecnologías y
                    fortaleciendo nuestra relación con
                    los clientes para construir un futuro
                    basado en la confianza y la innovación.
                </p>

            </div>

            ${fotoNosotros(
                '/img/Vision.jpg',
                'Nuestra visión en FerroMax',
                'Vision.jpg'
            )}

        </section>


        <!-- ==================================
             SECCIÓN MISIÓN
        ================================== -->

        <section class="fm-about-split fm-about-mision">

            ${fotoNosotros(
                '/img/Mision.jpg',
                'Nuestra misión en FerroMax',
                'Mision.jpg'
            )}

            <div class="fm-about-text">

                <span class="fm-about-eyebrow">
                    LO QUE NOS IMPULSA CADA DÍA
                </span>

                <h2>
                    Nuestra <span>Misión</span>
                </h2>

                <span class="fm-about-line"></span>

                <p class="fm-about-lead">
                    Facilitar la realización de proyectos
                    mediante productos de ferretería
                    accesibles, funcionales y confiables.
                </p>

                <p>
                    En FerroMax trabajamos para ofrecer
                    herramientas, materiales y accesorios
                    que ayuden a nuestros clientes a
                    construir, reparar y mejorar sus
                    espacios con mayor facilidad.
                </p>

                <p>
                    Nuestra misión es brindar una
                    experiencia de compra sencilla,
                    acompañada de información clara,
                    atención respetuosa y soluciones
                    orientadas a las necesidades de
                    cada proyecto.
                </p>

            </div>

        </section>


        <!-- ==================================
             SECCIÓN VALORES
        ================================== -->

        <section class="fm-about-values">

            <div class="fm-about-values-header">

                <span class="fm-about-eyebrow">
                    NUESTRA IDENTIDAD
                </span>

                <h2>
                    Nuestros <span>Valores</span>
                </h2>

                <span class="fm-about-line"></span>

                <p>
                    Estos son los principios que inspiran
                    nuestra manera de trabajar y la relación
                    que buscamos construir con cada cliente.
                </p>

            </div>

            <div class="fm-about-values-grid">

                ${valores.map(valor => `

                    <article class="fm-about-value-card">

                        <div class="fm-about-value-icon">
                            ${iconos[valor.icono]}
                        </div>

                        <h3>
                            ${valor.titulo}
                        </h3>

                        <p>
                            ${valor.descripcion}
                        </p>

                    </article>

                `).join('')}

            </div>

        </section>

    </div>

`;
