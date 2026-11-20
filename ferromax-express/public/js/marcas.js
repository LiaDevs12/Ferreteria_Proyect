import { esc } from './core.js';

/* ==========================================
   FERROMAX - LOGOTIPOS DE MARCAS
========================================== */

const LOGOS_MARCAS = {
    urrea: '/urrea.png',
    truper: '/truper.webp',
    fester: '/fester.png',
    comex: '/comex.png',
    petrul: '/petrul.png',
    phillips: '/phillips.png'
};

function claveMarca(nombre) {
    return String(nombre || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

export function tarjetaMarca(marca) {
    const nombre = String(
        marca.name || marca.nombre || ''
    ).trim();

    const clave = claveMarca(nombre);

    
const logo =
    marca.logo ||
    marca.logo_url ||
    LOGOS_MARCAS[clave] ||
    '';


    const enlace =
        '#/catalogo?brand=' +
        encodeURIComponent(nombre);

    return `
        <a
            href="${enlace}"
            class="fm-brand-card"
            title="Ver productos de ${esc(nombre)}"
            aria-label="Ver productos de ${esc(nombre)}"
        >
            <span class="fm-brand-fallback">
                ${esc(nombre)}
            </span>

            ${logo ? `
                <img
                    src="${esc(logo)}"
                    alt="Logotipo ${esc(nombre)}"
                    loading="lazy"
                    onerror="this.remove()"
                >
            ` : ''}
        </a>
    `;
}
/* ==========================================
   CARRUSEL AUTOMÁTICO DE MARCAS
========================================== */

let intervaloCarruselMarcas = null;

export function iniciarCarruselMarcas() {

    clearInterval(intervaloCarruselMarcas);

    const slider = document.querySelector(
        '[data-fm-brands-slider]'
    );

    if (!slider) return;

    const track = slider.querySelector(
        '[data-fm-brands-track]'
    );

    if (!track) return;

    const botones = slider.querySelectorAll(
        '[data-brand-direction]'
    );

    const hayDesbordamiento = () =>
        track.scrollWidth > track.clientWidth + 4;

    function mover(direccion = 1) {

        if (!hayDesbordamiento()) return;

        const tarjeta = track.querySelector(
            '.fm-brand-slide'
        );

        const ancho = tarjeta
            ? tarjeta.getBoundingClientRect().width
            : 180;

        const espacio =
            parseFloat(getComputedStyle(track).gap) || 16;

        const paso = ancho + espacio;

        const maximo =
            track.scrollWidth - track.clientWidth;

        let destino =
            track.scrollLeft + direccion * paso;

        if (direccion > 0 && destino > maximo - 4) {
            destino = 0;
        }

        if (direccion < 0 && destino < 0) {
            destino = maximo;
        }

        track.scrollTo({
            left: destino,
            behavior: 'smooth'
        });
    }

    botones.forEach(boton => {

        boton.hidden = !hayDesbordamiento();

        boton.addEventListener('click', () => {
            mover(
                Number(boton.dataset.brandDirection)
            );
        });

    });

    if (
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches
    ) {
        return;
    }

    intervaloCarruselMarcas = setInterval(() => {

        if (!slider.isConnected) {
            clearInterval(intervaloCarruselMarcas);
            return;
        }

        if (
            document.hidden ||
            slider.matches(':hover') ||
            slider.contains(document.activeElement)
        ) {
            return;
        }

        mover(1);

    }, 4500);
}
