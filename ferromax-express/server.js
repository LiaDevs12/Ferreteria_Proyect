
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* ==========================================
   FERROMAX
   CONFIGURACIÓN DEL ENTORNO
========================================== */

const raiz = path.dirname(
    fileURLToPath(import.meta.url)
);

const archivoEnv = path.join(
    raiz,
    '.env'
);

if (existsSync(archivoEnv)) {

    if (typeof process.loadEnvFile !== 'function') {
        throw new Error(
            'Utiliza Node.js 20.12 o posterior.'
        );
    }

    process.loadEnvFile(archivoEnv);
}

/* ==========================================
   CARGAR MÓDULOS DEL BACKEND
========================================== */

const [
    { pool },
    { createAdminRouter },
    { instalarSesiones },
    { registrarCatalogo },
    { registrarAutenticacion },
    { registrarPedidos }
] = await Promise.all([

    import('./db.js'),

    import('./src/admin/admin-router.js'),

    import('./src/storefront/sesiones.js'),

    import('./src/storefront/catalogo.js'),

    import('./src/storefront/autenticacion.js'),

    import('./src/storefront/pedidos.js')

]);

/* ==========================================
   CONFIGURACIÓN DE EXPRESS
========================================== */

const app = express();

app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
app.disable('x-powered-by');

app.use(
    express.json({
        limit: '40mb'
    })
);

/* ==========================================
   SESIONES DE LA TIENDA PÚBLICA

   Conservar el sistema existente.
========================================== */

instalarSesiones(app);

/* ==========================================
   SESIONES INDEPENDIENTES DEL ADMINISTRADOR
========================================== */

const sesionesAdmin = new Map();

const NOMBRE_COOKIE_ADMIN = 'ferromax_admin_sid';

const DURACION_ADMIN = 8 * 60 * 60 * 1000;

function sesionAdministrativa(req, res, next) {

    const ahora = Date.now();

    const cookies = String(
        req.headers.cookie || ''
    ).split(';');

    const cookieAdmin = cookies
        .map(valor => valor.trim())
        .find(valor =>
            valor.startsWith(
                NOMBRE_COOKIE_ADMIN + '='
            )
        );

    const sidAnterior = cookieAdmin
        ? cookieAdmin
            .slice(NOMBRE_COOKIE_ADMIN.length + 1)
        : '';

    let sid = /^[a-f0-9]{64}$/.test(sidAnterior)
        ? sidAnterior
        : '';

    let sesion = sid
        ? sesionesAdmin.get(sid)
        : null;

    /* ======================================
       CREAR SESIÓN SI NO EXISTE
    ====================================== */

    if (
        !sesion ||
        sesion.expira <= ahora
    ) {

        if (sid) {
            sesionesAdmin.delete(sid);
        }

        sid = crypto
            .randomBytes(32)
            .toString('hex');

        sesion = {
            user: null,
            expira: ahora + DURACION_ADMIN
        };

        sesionesAdmin.set(sid, sesion);

    } else {

        sesion.expira = ahora + DURACION_ADMIN;
    }

    /* ======================================
       COOKIE INDEPENDIENTE DEL CLIENTE
    ====================================== */

    const cookie = [
        `${NOMBRE_COOKIE_ADMIN}=${sid}`,
        'HttpOnly',
        'SameSite=Lax',
        'Path=/api/admin',
        `Max-Age=${Math.floor(DURACION_ADMIN / 1000)}`,
        ...(req.secure ? ['Secure'] : [])
    ].join('; ');

    res.append('Set-Cookie', cookie);

    res.setHeader(
        'Cache-Control',
        'no-store'
    );

    /* ======================================
       ASIGNAR SESIÓN ADMINISTRATIVA

       Las rutas del administrador siguen
       utilizando req.s.user, pero ahora
       apuntan a una sesión independiente.
    ====================================== */

    req.s = sesion;

    next();
}

/* ==========================================
   LIMPIAR SESIONES ADMINISTRATIVAS EXPIRADAS
========================================== */

const limpiezaAdmin = setInterval(() => {

    const ahora = Date.now();

    for (const [sid, sesion] of sesionesAdmin) {

        if (sesion.expira <= ahora) {
            sesionesAdmin.delete(sid);
        }
    }

}, 30 * 60 * 1000);

limpiezaAdmin.unref();

/* ==========================================
   API ADMINISTRATIVA

   SESIÓN INDEPENDIENTE
========================================== */

app.use(
    '/api/admin',
    sesionAdministrativa,
    createAdminRouter({ pool })
);

/* ==========================================
   API DE LA TIENDA PÚBLICA
========================================== */

const api = express.Router();

const { load } = registrarCatalogo(api);

registrarAutenticacion(api);

registrarPedidos(api, { load });

app.use('/api', api);

/* ==========================================
   VERIFICAR CONEXIÓN CON MYSQL
========================================== */

app.get(
    '/api/health',
    async (_req, res, next) => {

        try {

            await pool.query('SELECT 1');

            res.json({
                ok: true
            });

        } catch (error) {

            next(error);
        }
    }
);

/* ==========================================
   RUTAS API NO ENCONTRADAS
========================================== */

app.use('/api', (_req, res) => {

    res.status(404).json({
        error: 'Ruta de API no encontrada.'
    });

});

/* ==========================================
   ARCHIVOS PÚBLICOS
========================================== */

app.use(
    express.static(
        path.join(raiz, 'public')
    )
);

/* ==========================================
   NAVEGACIÓN DE LA TIENDA
========================================== */

app.use((req, res, next) => {

    if (
        req.method !== 'GET' &&
        req.method !== 'HEAD'
    ) {
        return next();
    }

    res.sendFile(
        path.join(
            raiz,
            'public',
            'index.html'
        )
    );

});

/* ==========================================
   ERRORES GENERALES
========================================== */

app.use((error, _req, res, _next) => {

    console.error(
        'Error del servidor:',
        error
    );

    if (!res.headersSent) {

        res.status(
            error.status || 500
        ).json({
            error:
                'No se pudo procesar la solicitud.'
        });
    }

});

/* ==========================================
   CONFIGURACIÓN DEL PAGO
========================================== */

const pagoPruebasHabilitado =

    process.env.ENABLE_DEMO_CHECKOUT === '1' &&

    process.env.NODE_ENV !== 'production';

/* ==========================================
   INICIAR SERVIDOR
========================================== */

app.listen(PORT, HOST, () => {
    console.log(`FerroMax escuchando en ${HOST}:${PORT}`);

    console.log(
        'Sesiones independientes: CLIENTES / ADMIN'
    );

    console.log(
        'Confirmación de tarjeta de prueba: ' +
        (
            pagoPruebasHabilitado
                ? 'HABILITADA'
                : 'DESHABILITADA'
        )
    );

    console.log(
        'NODE_ENV: ' +
        (process.env.NODE_ENV || 'development')
    );
});