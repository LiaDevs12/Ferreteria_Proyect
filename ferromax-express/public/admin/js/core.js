const API = '/api/admin';

export let me = null;
let messageTimeout;

export const $ = selector => document.querySelector(selector);

export const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char])
);

export const money = value => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
}).format(Number(value || 0));

export async function call(url, options = {}) {
    const response = await fetch(API + url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || 'No se pudo completar la operación.'
        );
    }

    return data;
}

export function msg(text) {
    const element = $('#msg');

    if (!element) return;

    clearTimeout(messageTimeout);

    element.textContent = text;
    element.classList.remove('hidden');

    messageTimeout = setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

export function imgData(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve('');

        if (file.size > 5 * 1024 * 1024) {
            return reject(
                new Error('La imagen no puede superar 5 MB.')
            );
        }

        if (![
            'image/jpeg',
            'image/png',
            'image/webp'
        ].includes(file.type)) {
            return reject(
                new Error('Solo se permiten imágenes JPG, PNG o WEBP.')
            );
        }

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = () => reject(
            new Error('No se pudo leer la fotografía.')
        );

        reader.readAsDataURL(file);
    });
}

/* ==========================================
   ICONOS
========================================== */

export function svgIcon(name) {
    const icons = {

        brands: `
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4a2 2 0 0 1 2-2h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z"/>
    <circle cx="7.5" cy="7.5" r="1.5"/>
`,

categories: `
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
`,

brands: `
    <path d="M20 13 13 20a2 2 0 0 1-2.8 0L3 12.8V4h8.8L20 10a2 2 0 0 1 0 3Z"/>
    <circle cx="7.5" cy="8" r="1"/>
`,

        home: `
            <rect x="3" y="3" width="8" height="8" rx="1.5"/>
            <rect x="13" y="3" width="8" height="5" rx="1.5"/>
            <rect x="13" y="10" width="8" height="11" rx="1.5"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5"/>
        `,
        products: `
            <path d="m12 3 9 5-9 5-9-5 9-5Z"/>
            <path d="m3 12 9 5 9-5"/>
            <path d="m3 16 9 5 9-5"/>
        `,
        reports: `
            <path d="M4 19V5M4 19h17"/>
            <path d="M8 15v-4M13 15V7M18 15V3"/>
        `,
        users: `
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="10" cy="7" r="4"/>
            <path d="M20 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        `,
        profile: `
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21a8 8 0 0 1 16 0"/>
        `,
        sales: `
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="m7 15 4-4 3 2 4-5"/>
        `,
        alert: `
            <path d="M12 3 2 21h20L12 3Z"/>
            <path d="M12 9v5M12 18h.01"/>
        `
    };

    return `
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            ${icons[name] || icons.products}
        </svg>
    `;
}

export function setMe(usuario) {
    me = usuario;
}
