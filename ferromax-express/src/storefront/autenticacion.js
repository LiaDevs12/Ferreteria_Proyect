import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../../db.js';
import { sessions } from './sesiones.js';
import { clean, emailOk, handle } from './helpers.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const DEMO_EMAIL = 'prueba@ejemplo.com';

export function registrarAutenticacion(api) {
const publicUser = user => user
    ? {
        name: user.name,
        email: user.email,
        isDemo: !!user.isDemo
    }
    : null;

/* ==========================================
   CREAR SESIÓN DE CLIENTE
========================================== */

function startSession(req, res, user) {

    /* ELIMINAR SESIÓN ANTERIOR */

    if (req.sid) {
        sessions.delete(req.sid);
    }

    /* GENERAR IDENTIFICADOR NUEVO */

    const sid = crypto.randomBytes(16)
        .toString('hex');

    /* CREAR SESIÓN AUTENTICADA */

    const sesion = {
        user
    };

    sessions.set(sid, sesion);

    /* ACTUALIZAR SOLICITUD ACTUAL */

    req.sid = sid;
    req.s = sesion;

    /* ENVIAR COOKIE AL NAVEGADOR */

    const secure = req.secure
        ? '; Secure'
        : '';

    res.setHeader(
        'Set-Cookie',
        `sid=${sid}; HttpOnly; SameSite=Lax; Path=/${secure}`
    );

    return publicUser(user);
}


/* ==========================================
   LÍMITE DE INTENTOS DE ACCESO
========================================== */

const tries = new Map();

function limited(req) {

    const now = Date.now();

    const list = (
        tries.get(req.ip) || []
    ).filter(
        value =>
            now - value < 900000
    );

    list.push(now);

    tries.set(
        req.ip,
        list
    );

    return list.length > 10;
}

/* ==========================================
   BUSCAR CLIENTE POR CORREO
========================================== */

async function findUser(mail) {

    const [rows] = await pool.query(`
        SELECT
            id_usuario AS id,
            nombre,
            correo,
            password_hash,
            rol,
            activo

        FROM usuarios

        WHERE correo = ?
    `, [mail]);

    return rows[0];
}

/* ==========================================
   REGISTRAR NUEVO CLIENTE
========================================== */

async function newUser(
    name,
    surname,
    mail,
    hash,
    googleSubject = null
) {

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

            const [result] = await conn.query(`
            INSERT INTO usuarios (
                nombre,
                apellido_paterno,
                correo,
                password_hash,
                rol
            )
            VALUES (?, ?, ?, ?, 'CLIENTE')
        `, [name, surname, mail, hash]);

        if (googleSubject) {
            await conn.query(
                'UPDATE usuarios SET google_sub = ? WHERE id_usuario = ?',
                [googleSubject, result.insertId]
            );
        }

        await conn.query(
            'INSERT INTO clientes (id_usuario) VALUES (?)',
            [result.insertId]
        );

        await conn.commit();

        return result.insertId;

    } catch (error) {

        await conn.rollback();

        throw error;

    } finally {

        conn.release();
    }
}

/* ==========================================
   USUARIO DE PRUEBA
========================================== */

api.post('/auth/demo-login', handle(async (
    req,
    res
) => {

    const email = DEMO_EMAIL;

    let [[user]] = await pool.query(
        'SELECT id_usuario AS id FROM usuarios WHERE correo = ?',
        [email]
    );

    if (!user) {

        const id = await newUser(
            'Cliente',
            'de Prueba',
            email,
            '!SIN-ACCESO-DEMO'
        );

        user = {
            id
        };
    }

    res.json(
        startSession(
            req,
            res,
            {
                id: user.id,

                name: 'Cliente de prueba',

                email,

                isDemo: true,

                rol: 'CLIENTE'
            }
        )
    );
}));

/* ==========================================
   CERRAR SESIÓN
========================================== */


/* ==========================================
   CERRAR SESIÓN
========================================== */

api.post('/auth/logout', (req, res) => {

    if (req.sid) {
        sessions.delete(req.sid);
    }

    if (req.s) {
        req.s.user = null;
    }

    res.setHeader(
        'Set-Cookie',
        'sid=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/'
    );

    res.status(204).end();

});


/* ==========================================
   SESIÓN ACTUAL
========================================== */

api.get('/auth/me', (
    req,
    res
) => {

    res.json(
        publicUser(
            req.s.user
        )
    );
});

/* ==========================================
   CONFIGURACIÓN DE GOOGLE
========================================== */

api.get('/config', (
    req,
    res
) => {

    res.json({
        googleClientId:
            GOOGLE_CLIENT_ID
    });
});

/* ==========================================
   REGISTRO DE CLIENTES
========================================== */

api.post('/auth/register', handle(async (
    req,
    res
) => {

    if (limited(req)) {
        return res.status(429).json({
            error:
                'Demasiados intentos. Espera unos minutos.'
        });
    }

    const {
        name,
        apellido,
        email,
        password
    } = req.body || {};

    const invalid =
        clean(name).length < 2 ||
        clean(apellido).length < 2 ||
        !emailOk(email) ||
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 72;

    if (invalid) {
        return res.status(400).json({
            error: 'Datos inválidos',

            fields: [
                'name',
                'apellido',
                'email',
                'password'
            ]
        });
    }

    const mail = clean(
        email
    ).toLowerCase();

    if (await findUser(mail)) {
        return res.status(409).json({
            error:
                'Ese correo ya está registrado'
        });
    }

    const hash = await bcrypt.hash(
        password,
        10
    );

    const id = await newUser(
        clean(name),
        clean(apellido),
        mail,
        hash
    );

    res.status(201).json(
        startSession(
            req,
            res,
            {
                id,

                name: clean(name),

                email: mail,

                rol: 'CLIENTE'
            }
        )
    );
}));

/* ==========================================
   LOGIN DE CLIENTES
========================================== */

api.post('/auth/login', handle(async (
    req,
    res
) => {

    if (limited(req)) {
        return res.status(429).json({
            error:
                'Demasiados intentos. Espera unos minutos.'
        });
    }

    const user = await findUser(
        clean(
            req.body?.email
        ).toLowerCase()
    );

    const password = String(
        req.body?.password || ''
    );

    const valid =
        user?.activo &&
        user.rol === 'CLIENTE' &&
        typeof user.password_hash === 'string' &&
        user.password_hash.startsWith('$2') &&
        await bcrypt.compare(
            password,
            user.password_hash
        );

    if (!valid) {
        return res.status(401).json({
            error:
                'Correo o contraseña incorrectos'
        });
    }

    res.json(
        startSession(
            req,
            res,
            {
                id: user.id,

                name: user.nombre,

                email: user.correo,

                rol: 'CLIENTE'
            }
        )
    );
}));

/* ==========================================
   LOGIN CON GOOGLE
========================================== */

api.post('/auth/google', handle(async (req, res) => {
    if (!googleClient) {
        return res.status(501).json({
            error: 'Inicio con Google no configurado (falta GOOGLE_CLIENT_ID)'
        });
    }

    if (limited(req)) {
        return res.status(429).json({
            error: 'Demasiados intentos. Espera unos minutos.'
        });
    }

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: String(req.body?.credential || ''),
            audience: GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
    } catch {
        return res.status(401).json({
            error: 'Token de Google inválido'
        });
    }

    if (
        typeof payload?.sub !== 'string' ||
        !/^[\x21-\x7e]{1,255}$/.test(payload.sub) ||
        typeof payload.email !== 'string' ||
        payload.email.length > 150 ||
        !emailOk(payload.email) ||
        payload.email_verified !== true
    ) {
        return res.status(401).json({
            error: 'Tu correo de Google no está verificado'
        });
    }

    const mail = clean(payload.email).toLowerCase();
    const subject = payload.sub;
    const [[existingUser]] = await pool.query(`
        SELECT id_usuario AS id, nombre, correo, password_hash, rol, activo, google_sub
        FROM usuarios
        WHERE google_sub = ? OR correo = ?
        ORDER BY (google_sub = ?) DESC
        LIMIT 1
    `, [subject, mail, subject]);
    let user = existingUser;

    if (mail === DEMO_EMAIL || (user && (!user.activo || user.rol !== 'CLIENTE'))) {
        return res.status(403).json({
            error: 'Esta cuenta no puede entrar a la tienda'
        });
    }

    const conflict = () => res.status(409).json({
        error: 'No se pudo vincular la cuenta de Google. Vuelve a iniciar sesión con Google.'
    });

    try {
        if (!user) {
            const nombre = clean(payload.given_name || payload.name).slice(0, 100) || 'Cliente';
            const apellido = clean(payload.family_name).slice(0, 100) || '-';
            const id = await newUser(nombre, apellido, mail, '!GOOGLE', subject);
            user = { id, nombre, correo: mail };
        } else if (user.google_sub !== subject) {
            if (user.google_sub !== null) return conflict();

            const googleControlsEmail = mail.endsWith('@gmail.com') || Boolean(payload.hd);
            const legacyGoogleAccount = user.password_hash === '!GOOGLE' && googleControlsEmail;

            if (!legacyGoogleAccount) {
                if (!user.password_hash?.startsWith('$2')) {
                    return res.status(403).json({
                        error: 'Contacta a soporte para vincular tu cuenta de FerroMax con Google.'
                    });
                }

                const password = req.body?.password;
                if (typeof password !== 'string' || password.length === 0) {
                    return res.status(409).json({
                        code: 'GOOGLE_LINK_REQUIRED',
                        error: 'Confirma tu contraseña de FerroMax para vincular la cuenta de Google.'
                    });
                }

                if (password.length > 72 || !(await bcrypt.compare(password, user.password_hash))) {
                    return res.status(401).json({
                        error: 'La contraseña de FerroMax es incorrecta.'
                    });
                }
            }

            const [updated] = await pool.query(`
                UPDATE usuarios SET google_sub = ?
                WHERE id_usuario = ? AND correo = ? AND BINARY password_hash = ?
                  AND google_sub IS NULL AND activo = 1 AND rol = 'CLIENTE'
            `, [subject, user.id, user.correo, user.password_hash]);

            if (updated.affectedRows !== 1) return conflict();
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return conflict();
        throw error;
    }

    res.json(startSession(req, res, {
        id: user.id,
        name: user.nombre,
        email: user.correo,
        rol: 'CLIENTE'
    }));
}));

/* ==========================================
   RECUPERACIÓN DE CONTRASEÑA
========================================== */

api.post('/auth/recover', (
    req,
    res
) => {

    res.status(501).json({
        error:
            'Recuperación de contraseña pendiente (requiere servicio de correo)'
    });
});

/* ==========================================
   CONFIGURACIÓN DE PEDIDOS
========================================== */

}
