import { leerImagen } from './src/storage/imagenes.js';
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
    const opcionesCookie = {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/admin',
        secure: req.secure || process.env.NODE_ENV === 'production'
    };

    function escribirCookie(sid, maxAge) {
        const cookies = [res.getHeader('Set-Cookie')].flat().filter(cookie =>
            typeof cookie === 'string' &&
            !cookie.startsWith(`${NOMBRE_COOKIE_ADMIN}=`)
        );

        res.setHeader('Set-Cookie', cookies);
        res.cookie(NOMBRE_COOKIE_ADMIN, sid, { ...opcionesCookie, maxAge });
    }

    const prefijo = `${NOMBRE_COOKIE_ADMIN}=`;
    const sidRecibido = (req.headers.cookie || '').split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith(prefijo))?.slice(prefijo.length);

    let sid = /^[a-f0-9]{64}$/.test(sidRecibido || '') ? sidRecibido : null;
    let sesion = sid ? sesionesAdmin.get(sid) : null;

    function invalidarSesion() {
        if (sid) sesionesAdmin.delete(sid);

        if (sesion) {
            sesion.user = null;
            delete sesion.accesoGooglePersonal;
        }
    }

    function crearSesion(usuario) {
        invalidarSesion();
        sid = crypto.randomBytes(32).toString('hex');
        sesion = { user: usuario, expira: Date.now() + DURACION_ADMIN };
        sesionesAdmin.set(sid, sesion);
        req.s = sesion;
        escribirCookie(sid, DURACION_ADMIN);
    }

    if (!sesion || sesion.expira <= Date.now()) {
        crearSesion(null);
    } else {
        req.s = sesion;
    }

    req.iniciarSesionAdmin = crearSesion;
    req.cerrarSesionAdmin = () => {
        invalidarSesion();
        escribirCookie('', 0);
    };

    res.setHeader('Cache-Control', 'no-store');
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
   LOCAL / RAILWAY STORAGE BUCKET
========================================== */

// Fotografías públicas de productos y marcas
app.get(
    /^\/uploads\/(products|brands)\/[a-zA-Z0-9_.-]+$/,
    async (req, res, next) => {

        // En local, Express sirve los archivos normales
        if (process.env.STORAGE_PROVIDER !== 's3') {
            return next();
        }

        try {
            const { bytes, tipo } = await leerImagen(req.path);

            res.setHeader('Content-Type', tipo);
            res.setHeader('Cache-Control', 'public, max-age=3600');

            return res.send(bytes);

        } catch (error) {

            if (
                error.name === 'NoSuchKey' ||
                error.name === 'NotFound'
            ) {
                return res.status(404).end();
            }

            return next(error);
        }
    }
);

// Evitar que las evidencias privadas de reportes
// se publiquen como archivos estáticos
app.use('/uploads/reports', (_req, res) => {
    res.status(403).json({
        error: 'Acceso no autorizado a evidencias.'
    });
});

// Archivos públicos normales: HTML, CSS, JS, etc.
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