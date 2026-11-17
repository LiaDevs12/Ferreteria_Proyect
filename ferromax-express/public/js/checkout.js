
import {
    api,
    cart,
    user,
    esc,
    mxn
} from './core.js';

/* ==========================================
   FERROMAX - FORMULARIO DE COMPRA
========================================== */

const campo = (
    nombre,
    etiqueta,
    tipo = 'text',
    atributos = ''
) => `
    <label class="fm-pay-field">

        <span>${esc(etiqueta)}</span>

        <input
            class="field"
            name="${esc(nombre)}"
            type="${tipo}"
            ${atributos}
            required
        >

        <small
            class="fm-pay-error"
            data-err="${esc(nombre)}"
        ></small>

    </label>
`;


/* ==========================================
   VISTA DEL CHECKOUT
========================================== */

export async function vistaCheckout() {

    const total = await api('/pricing', {

        method: 'POST',

        body: {
            lines: cart
        }

    });

    if (!total?.items?.length) {

        return `
            <div class="fm-pay-empty">

                <h1>
                    No hay productos disponibles
                </h1>

                <p>
                    Revisa los artículos de tu carrito
                    para continuar.
                </p>

                <a class="btn" href="#/carrito">
                    Volver al carrito
                </a>

            </div>
        `;
    }

    return `

        <section class="fm-pay-page">

            <!-- ENCABEZADO -->

            <header class="fm-pay-header">

                <span>
                    FERROMAX · FINALIZAR COMPRA
                </span>

                <h1>
                    Finalizar compra
                </h1>

                <p>
                    Completa tus datos y selecciona
                    la forma de pago.
                </p>

            </header>


            <div class="fm-pay-layout">

                <!-- FORMULARIO -->

                <form
                    id="co"
                    class="fm-pay-form"
                    novalidate
                >

                    <!-- CONTACTO -->

                    <section class="fm-pay-box">

                        <div class="fm-pay-box-head">

                            <b>01</b>

                            <div>

                                <h2>
                                    Información de contacto
                                </h2>

                                <p>
                                    Datos de la persona
                                    que realiza el pedido.
                                </p>

                            </div>

                        </div>

                        <div class="fm-pay-fields">

                            ${campo(
                                'name',
                                'Nombre completo',
                                'text',
                                `autocomplete="name"
                                 value="${esc(user?.name || '')}"`
                            )}

                            ${campo(
                                'email',
                                'Correo electrónico',
                                'email',
                                `autocomplete="email"
                                 value="${esc(user?.email || '')}"`
                            )}

                        </div>

                    </section>


                    <!-- DIRECCIÓN -->

                    <section class="fm-pay-box">

                        <div class="fm-pay-box-head">

                            <b>02</b>

                            <div>

                                <h2>
                                    Dirección de entrega
                                </h2>

                                <p>
                                    Indica dónde deseas
                                    recibir tu pedido.
                                </p>

                            </div>

                        </div>

                        <div class="fm-pay-fields">

                            ${campo(
                                'calle',
                                'Calle',
                                'text',
                                'autocomplete="address-line1"'
                            )}

                            ${campo(
                                'numeroExterior',
                                'Número exterior'
                            )}

                            ${campo(
                                'colonia',
                                'Colonia'
                            )}

                            ${campo(
                                'codigoPostal',
                                'Código postal',
                                'text',
                                `inputmode="numeric"
                                 maxlength="5"
                                 autocomplete="postal-code"`
                            )}

                            ${campo(
                                'ciudad',
                                'Ciudad'
                            )}

                            ${campo(
                                'estado',
                                'Estado'
                            )}

                        </div>

                        <label class="fm-pay-field">

                            <span>
                                Tipo de entrega
                            </span>

                            <select
                                class="field"
                                name="delivery"
                            >

                                <option value="domicilio">
                                    Envío a domicilio
                                </option>

                                <option value="sucursal">
                                    Recoger en sucursal
                                </option>

                            </select>

                        </label>

                    </section>


                    <!-- MÉTODO DE PAGO -->

                    <section class="fm-pay-box">

                        <div class="fm-pay-box-head">

                            <b>03</b>

                            <div>

                                <h2>
                                    Método de pago
                                </h2>

                                <p>
                                    Selecciona cómo deseas
                                    pagar tu pedido.
                                </p>

                            </div>

                        </div>

                        <label class="fm-pay-field">

                            <span>
                                Forma de pago
                            </span>

                            <select
                                class="field"
                                id="fm-payment-method"
                                name="paymentMethod"
                            >

                                <option value="tarjeta">
                                    Tarjeta de crédito o débito
                                </option>

                                <option value="transferencia">
                                    Transferencia bancaria
                                </option>

                                <option value="tienda">
                                    Pago en tienda
                                </option>

                            </select>

                        </label>


                        <!-- CAMPOS DE TARJETA -->

                        <div
                            id="fm-demo-fields"
                            class="fm-pay-demo"
                        >

                            <label class="fm-pay-field">

                                <span>
                                    Número de tarjeta
                                </span>

                                <input
                                    class="field"
                                    id="fm-demo-number"
                                    type="text"
                                    inputmode="numeric"
                                    autocomplete="off"
                                    maxlength="19"
                                    placeholder="0000 0000 0000 0000"
                                >

                                <small
                                    class="fm-pay-error"
                                    data-err="cardNumber"
                                ></small>

                            </label>


                            <div class="fm-pay-fields">

                                <label class="fm-pay-field">

                                    <span>
                                        Fecha de vencimiento
                                    </span>

                                    <input
                                        class="field"
                                        id="fm-demo-expiry"
                                        type="text"
                                        inputmode="numeric"
                                        autocomplete="off"
                                        maxlength="5"
                                        placeholder="MM/AA"
                                    >

                                    <small
                                        class="fm-pay-error"
                                        data-err="expiry"
                                    ></small>

                                </label>


                                <label class="fm-pay-field">

                                    <span>
                                        Código de seguridad
                                    </span>

                                    <input
                                        class="field"
                                        id="fm-demo-cvv"
                                        type="password"
                                        inputmode="numeric"
                                        autocomplete="off"
                                        maxlength="3"
                                        placeholder="CVV"
                                    >

                                    <small
                                        class="fm-pay-error"
                                        data-err="cvv"
                                    ></small>

                                </label>

                            </div>

                        </div>

                    </section>


                    <!-- MENSAJES DE VALIDACIÓN -->

                    <div
                        id="ce"
                        class="fm-pay-global-error"
                        role="alert"
                    ></div>


                    <!-- BOTÓN FINAL -->

                    <button
                        type="submit"
                        class="fm-pay-submit"
                    >
                        Confirmar pedido
                    </button>


                    <p class="fm-pay-disclaimer">
                        No introduzcas datos bancarios reales.
                        Este sitio no procesa cobros bancarios.
                    </p>

                </form>


                <!-- RESUMEN DE COMPRA -->

                <aside class="fm-pay-summary">

                    <span class="fm-pay-summary-label">
                        TU PEDIDO
                    </span>

                    <h2>
                        Resumen de compra
                    </h2>

                    <div class="fm-pay-items">

                        ${total.items.map(item => `

                            <div class="fm-pay-item">

                                <span>
                                    ${esc(item.quantity)}
                                    ×
                                    ${esc(item.name)}
                                </span>

                                <strong>
                                    ${mxn(item.subtotal)}
                                </strong>

                            </div>

                        `).join('')}

                    </div>


                    <div class="fm-pay-totals">

                        <div>

                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ${mxn(total.subtotal)}
                            </strong>

                        </div>

                        <div>

                            <span>
                                Envío
                            </span>

                            <strong>
                                ${mxn(total.shipping)}
                            </strong>

                        </div>

                    </div>


                    <div class="fm-pay-grand-total">

                        <span>
                            Total
                        </span>

                        <strong>
                            ${mxn(total.total)}
                        </strong>

                    </div>


                    <a
                        href="#/carrito"
                        class="fm-pay-back"
                    >
                        ← Volver al carrito
                    </a>

                </aside>

            </div>

        </section>

    `;
}


/* ==========================================
   VALIDACIÓN DE TARJETA FICTICIA
========================================== */

/*
   Se conserva el nombre de esta función
   porque eventos.js ya la importa.

   Los datos se validan localmente.
   Nunca se envían al backend.
*/


/* ==========================================
   FERROMAX - VALIDACIÓN DE DATOS FICTICIOS
========================================== */

export function validarTarjetaDePrueba(form) {

    const errores = {};

    if (!form) {
        return errores;
    }

    const metodo = form.elements.paymentMethod?.value;

    if (metodo !== 'tarjeta') {
        return errores;
    }

    const numero = (
        form.querySelector('#fm-demo-number')?.value || ''
    ).replace(/\D/g, '');

    const vencimiento = (
        form.querySelector('#fm-demo-expiry')?.value || ''
    ).trim();

    const cvv = (
        form.querySelector('#fm-demo-cvv')?.value || ''
    ).replace(/\D/g, '');

    /* ACEPTAR CUALQUIER NÚMERO FICTICIO */

    if (!numero.length) {
        errores.cardNumber =
            'Introduce un número para continuar.';
    }

    /* ACEPTAR CUALQUIER MES Y AÑO DE PRUEBA */

    if (!/^\d{2}\/\d{2}$/.test(vencimiento)) {
        errores.expiry =
            'Introduce la fecha en formato MM/AA.';
    }

    /* ACEPTAR CUALQUIER CVV NUMÉRICO */

    if (!cvv.length) {
        errores.cvv =
            'Introduce un código de seguridad.';
    }

    return errores;
}



/* ==========================================
   CONTROLES DEL FORMULARIO DE PAGO
========================================== */

export function activarCheckoutDemo() {

    const formulario = document.querySelector('#co');

    if (!formulario) {
        return;
    }

    const metodo = formulario.querySelector(
        '#fm-payment-method'
    );

    const campos = formulario.querySelector(
        '#fm-demo-fields'
    );

    const boton = formulario.querySelector(
        '.fm-pay-submit'
    );

    const numero = formulario.querySelector(
        '#fm-demo-number'
    );

    const fecha = formulario.querySelector(
        '#fm-demo-expiry'
    );

    const cvv = formulario.querySelector(
        '#fm-demo-cvv'
    );

    if (
        !metodo ||
        !campos ||
        !boton ||
        !numero ||
        !fecha ||
        !cvv
    ) {
        return;
    }


    function actualizar() {

        campos.hidden =
            metodo.value !== 'tarjeta';

        boton.textContent =
            'Confirmar pedido';
    }

    metodo.addEventListener(
        'change',
        actualizar
    );


    numero.addEventListener('input', () => {

        const digitos = numero.value
            .replace(/\D/g, '')
            .slice(0, 16);

        numero.value = digitos
            .replace(/(\d{4})(?=\d)/g, '$1 ')
            .trim();
    });


    fecha.addEventListener('input', () => {

        const digitos = fecha.value
            .replace(/\D/g, '')
            .slice(0, 4);

        fecha.value = digitos.length > 2
            ? `${digitos.slice(0, 2)}/${digitos.slice(2)}`
            : digitos;
    });


    cvv.addEventListener('input', () => {

        cvv.value = cvv.value
            .replace(/\D/g, '')
            .slice(0, 3);
    });


    actualizar();
}
