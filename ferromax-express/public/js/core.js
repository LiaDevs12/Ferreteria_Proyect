
import { emo } from '/ui.js';

/* ==========================================
   FERROMAX - UTILIDADES GENERALES
========================================== */

export const $ = selector =>
    document.querySelector(selector);

export const app = $('#app');

export const esc = valor =>
    String(valor ?? '').replace(
        /[&<>"']/g,
        caracter => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[caracter])
    );

export const mxn = valor =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor) || 0);

export const norm = valor =>
    String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export const imageUrl = valor =>
    typeof valor === 'string'
        ? valor.trim()
        : String(
            valor?.url ??
            valor?.url_imagen ??
            valor?.src ??
            valor?.image ??
            ''
        ).trim();

export const validImage = valor =>
    /^(https?:\/\/|\/)/i.test(valor || '');

export const picture = producto =>
    validImage(producto.image)
        ? `
            <img
                src="${esc(producto.image)}"
                alt="${esc(producto.name)}"
                loading="lazy"
            >
        `
        : emo(producto.name);

/* ==========================================
   API DE LA TIENDA
========================================== */

export async function api(url, options = {}) {

    const response = await fetch('/api' + url, {

        ...options,

        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },

        body: options.body === undefined
            ? undefined
            : JSON.stringify(options.body)
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {

        throw Object.assign(
            new Error(
                data.error ||
                `Error ${response.status}`
            ),
            {
                fields: data.fields,
                code: data.code
            }
        );
    }

    return data;
}

export const prod = id =>
    api(
        '/products/' +
        encodeURIComponent(id)
    );

/* ==========================================
   NOTIFICACIONES
========================================== */

export function toast(message) {

    const elemento = document.createElement('div');

    elemento.className = 'fm-toast';

    elemento.setAttribute(
        'role',
        'status'
    );

    elemento.textContent = message;

    document.body.append(elemento);

    setTimeout(() => {
        elemento.remove();
    }, 2200);
}

/* ==========================================
   USUARIO Y CARRITO
========================================== */

export let user = null;

export let cart = [];

try {

    cart = JSON.parse(
        localStorage.getItem(
            'ferromax_cart'
        ) || '[]'
    );

    if (!Array.isArray(cart)) {
        cart = [];
    }

} catch {

    cart = [];
}

/* ==========================================
   FAVORITOS INDEPENDIENTES POR USUARIO

   Cada cuenta tiene su propia lista.
   No se comparten favoritos entre usuarios.
========================================== */

export const favorites = new Set();

/* ==========================================
   OBTENER IDENTIFICADOR DE CUENTA
========================================== */

function identificadorUsuario(cuenta) {

    if (!cuenta) {
        return null;
    }

    const correo = String(
        cuenta.email ??
        cuenta.correo ??
        ''
    ).trim().toLowerCase();

    if (correo) {
        return `correo:${correo}`;
    }

    if (cuenta.id != null) {
        return `id:${cuenta.id}`;
    }

    return null;
}

/* ==========================================
   GENERAR CLAVE PRIVADA DE FAVORITOS
========================================== */

function claveFavoritos(cuenta) {

    const identificador =
        identificadorUsuario(cuenta);

    if (!identificador) {
        return null;
    }

    return (
        'ferromax_favorites_user_' +
        encodeURIComponent(identificador)
    );
}

/* ==========================================
   CARGAR FAVORITOS DE UNA CUENTA
========================================== */

function cargarFavoritos(cuenta) {

    // Vaciar los favoritos del usuario anterior.
    // Se conserva la referencia original del Set.
    favorites.clear();

    const clave = claveFavoritos(cuenta);

    if (!clave) {
        actualizarBotonesFavoritos();
        return;
    }

    try {

        const guardados = JSON.parse(
            localStorage.getItem(clave) || '[]'
        );

        if (Array.isArray(guardados)) {

            guardados.forEach(id => {

                if (
                    id !== null &&
                    id !== undefined
                ) {
                    favorites.add(String(id));
                }
            });
        }

    } catch (error) {

        console.warn(
            'No se pudieron cargar los favoritos:',
            error
        );
    }

    actualizarBotonesFavoritos();
}

/* ==========================================
   GUARDAR FAVORITOS DE LA CUENTA ACTUAL
========================================== */

function guardarFavoritos() {

    const clave = claveFavoritos(user);

    // Los visitantes pueden marcar favoritos
    // temporalmente, pero no se almacenan
    // como favoritos de otra cuenta.
    if (!clave) {
        return;
    }

    localStorage.setItem(
        clave,
        JSON.stringify([...favorites])
    );
}

/* ==========================================
   ACTUALIZAR ICONOS DE FAVORITOS
========================================== */

function actualizarBotonesFavoritos() {

    document.querySelectorAll(
        '[data-favorite]'
    ).forEach(boton => {

        const id = String(
            boton.dataset.favorite
        );

        const activo = favorites.has(id);

        boton.classList.toggle(
            'is-favorite',
            activo
        );

        boton.setAttribute(
            'aria-pressed',
            String(activo)
        );

        boton.setAttribute(
            'aria-label',
            activo
                ? 'Quitar de favoritos'
                : 'Agregar a favoritos'
        );
    });
}

/* ==========================================
   ELIMINAR ALMACENAMIENTO ANTIGUO

   La clave anterior era compartida por todos
   los usuarios y no permitía identificar
   a qué cuenta pertenecían los productos.
========================================== */

try {

    localStorage.removeItem(
        'ferromax_favorites'
    );

} catch (error) {

    console.warn(
        'No se pudo limpiar la clave antigua:',
        error
    );
}

/* ==========================================
   AGREGAR O QUITAR FAVORITOS
========================================== */

export function toggleFavorite(id) {

    id = String(id);

    if (favorites.has(id)) {

        favorites.delete(id);

    } else {

        favorites.add(id);
    }

    // Guardar únicamente en la cuenta actual.
    guardarFavoritos();

    // Actualizar todos los botones visibles.
    actualizarBotonesFavoritos();

    toast(
        favorites.has(id)
            ? 'Agregado a favoritos'
            : 'Eliminado de favoritos'
    );
}

/* ==========================================
   CANTIDAD DE PRODUCTO EN CARRITO
========================================== */

export const qtyOf = id =>
    cart.find(
        producto =>
            String(producto.productId) ===
            String(id)
    )?.quantity || 0;

/* ==========================================
   ACTUALIZAR TOTAL DEL CARRITO
========================================== */

export async function refreshTotal() {

    try {

        const total = cart.length

            ? await api('/pricing', {

                method: 'POST',

                body: {
                    lines: cart
                }

            })

            : null;

        if ($('#ct')) {

            $('#ct').textContent = mxn(
                total?.subtotal || 0
            );
        }

    } catch (error) {

        console.warn(
            'No se pudo actualizar el total:',
            error
        );
    }
}

/* ==========================================
   GUARDAR CARRITO
========================================== */

export function saveCart() {

    localStorage.setItem(
        'ferromax_cart',
        JSON.stringify(cart)
    );

    if ($('#cc')) {

        $('#cc').textContent = cart.reduce(
            (total, linea) =>
                total + Number(
                    linea.quantity || 0
                ),
            0
        );
    }

    refreshTotal();
}

/* ==========================================
   MODIFICAR CANTIDAD DE UN PRODUCTO
========================================== */

export function setQty(producto, cantidad) {

    cantidad = Math.max(
        0,
        Math.min(
            Number(cantidad) || 0,
            Number(producto.stock) || 0
        )
    );

    cart = cart.filter(
        linea =>
            String(linea.productId) !==
            String(producto.id)
    );

    if (cantidad) {

        cart.push({
            productId: producto.id,
            quantity: cantidad
        });
    }

    saveCart();
}

/* ==========================================
   CONTROL DE SESIÓN DE CLIENTES

   - Limpia el carrito cuando corresponde.
   - Separa favoritos por cuenta.
   - Limpia favoritos al cerrar sesión.
   - Recupera favoritos al regresar.
========================================== */

export const setUser = nuevoUsuario => {

    const identificadorNuevo =
        identificadorUsuario(nuevoUsuario);

    const identificadorAnterior =
        localStorage.getItem(
            'ferromax_cart_owner'
        );

    const cerrandoSesion =
        Boolean(user) && !nuevoUsuario;

    const cambiandoCuenta =
        Boolean(identificadorNuevo) &&
        identificadorNuevo !== identificadorAnterior;

    const sesionAnterior =
        !identificadorNuevo &&
        Boolean(identificadorAnterior);

    /* ======================================
       LIMPIAR CARRITO CUANDO CORRESPONDA
    ====================================== */

    if (
        cerrandoSesion ||
        cambiandoCuenta ||
        sesionAnterior
    ) {

        cart = [];
    }

    /* ======================================
       ACTUALIZAR USUARIO
    ====================================== */

    user = nuevoUsuario || null;

    /* ======================================
       ACTUALIZAR PROPIETARIO DEL CARRITO
    ====================================== */

    if (identificadorNuevo) {

        localStorage.setItem(
            'ferromax_cart_owner',
            identificadorNuevo
        );

    } else {

        localStorage.removeItem(
            'ferromax_cart_owner'
        );
    }

    /* ======================================
       CAMBIAR FAVORITOS DE LA CUENTA

       Nunca se arrastran los favoritos
       del usuario anterior.
    ====================================== */

    cargarFavoritos(user);

    /* ======================================
       ACTUALIZAR CARRITO Y CONTADORES
    ====================================== */

    saveCart();
};

/* ==========================================
   ACTUALIZAR CARRITO DESDE OTROS MÓDULOS
========================================== */

export const setCart = nuevoCarrito => {

    cart = Array.isArray(nuevoCarrito)
        ? nuevoCarrito
        : [];
};

/* ==========================================
   DESPLAZAMIENTO DE CATEGORÍAS
========================================== */

export let categoryScroll = 0;

export const setCategoryScroll = valor => {

    categoryScroll = Number(valor) || 0;
};
