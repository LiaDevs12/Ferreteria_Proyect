
import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

import { pool } from './db.js';
import { priceCart } from './pricing.js';
import { createAdminRouter } from './src/admin/admin-router.js';

/* ==========================================
   CONFIGURACIÓN PRINCIPAL
========================================== */

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const GOOGLE_CLIENT_ID =
    process.env.GOOGLE_CLIENT_ID || '';

const googleClient = GOOGLE_CLIENT_ID
    ? new OAuth2Client(GOOGLE_CLIENT_ID)
    : null;

const clean = value =>
    String(value ?? '').trim();

const emailOk = value =>
    /^\S+@\S+\.\S+$/.test(clean(value));

app.use(express.json({
    limit: '40mb'
}));

/* ==========================================
   SESIONES
========================================== */

const sessions = new Map();

app.use((req, res, next) => {
    let sid = /(?:^|;\s*)sid=([a-f0-9]{32})/
        .exec(req.headers.cookie || '')?.[1];

    if (!sid || !sessions.has(sid)) {
        sid = crypto.randomBytes(16)
            .toString('hex');

        sessions.set(sid, {
            user: null
        });

        res.setHeader(
            'Set-Cookie',
            `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`
        );
    }

    req.sid = sid;
    req.s = sessions.get(sid);

    next();
});

/* ==========================================
   MANEJO DE ERRORES
========================================== */

const handle = fn => (req, res, next) =>
    Promise.resolve()
        .then(() => fn(req, res, next))
        .catch(error => {
            console.error(
                'Error en API:',
                error
            );

            if (!res.headersSent) {
                res.status(500).json({
                    error:
                        'Error del servidor. Revisa la terminal y la conexión con MySQL.'
                });
            }
        });

/* ==========================================
   ESPECIFICACIONES TÉCNICAS
========================================== */

function parseProductSpecs(value) {

    if (value == null || value === '') {
        return [];
    }

    if (Buffer.isBuffer(value)) {
        value = value.toString('utf8');
    }

    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return [];
        }
    }

    if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
    ) {
        if (Array.isArray(value.items)) {
            value = value.items;

        } else if (
            Array.isArray(value.especificaciones)
        ) {
            value = value.especificaciones;

        } else {
            value = Object.entries(value).map(
                ([caracteristica, valor]) => ({
                    caracteristica,
                    valor
                })
            );
        }
    }

    if (!Array.isArray(value)) {
        return [];
    }

    return value.map(item => {

        if (Array.isArray(item)) {
            return {
                caracteristica: clean(item[0]),
                valor: clean(item[1])
            };
        }

        if (typeof item === 'string') {
            const match = item.match(
                /^(.+?)\s*(?:[:：|–—]|\s+-\s+)\s*(.+)$/
            );

            return match
                ? {
                    caracteristica: clean(match[1]),
                    valor: clean(match[2])
                }
                : null;
        }

        if (
            item &&
            typeof item === 'object'
        ) {
            return {
                caracteristica: clean(
                    item.caracteristica ??
                    item.concepto ??
                    item.nombre ??
                    item.name ??
                    item.label
                ),

                valor: clean(
                    item.valor ??
                    item.medida ??
                    item.value
                )
            };
        }

        return null;

    }).filter(item =>
        item &&
        item.caracteristica &&
        item.valor
    ).slice(0, 30);
}

/* ==========================================
   CONSULTA BASE DE PRODUCTOS
========================================== */

const BASE = `
    SELECT
        p.id_producto AS id,
        p.sku,
        p.nombre AS name,
        p.descripcion AS description,
        p.especificaciones_tecnicas,
        p.precio AS price,
        p.id_categoria AS categoryId,
        m.nombre AS brand,
        p.unidad_venta AS unit,

        COALESCE(e.stock, 0) AS stock,

        (
            SELECT i.url_imagen
            FROM imagenes_producto i

            WHERE
                i.id_producto = p.id_producto

            ORDER BY
                i.es_principal DESC,
                i.orden_visual ASC,
                i.id_imagen ASC

            LIMIT 1
        ) AS image

    FROM productos p

    JOIN categorias c
        ON c.id_categoria = p.id_categoria

    LEFT JOIN marcas m
        ON m.id_marca = p.id_marca

    LEFT JOIN (
        SELECT
            id_producto,
            SUM(existencia_actual) AS stock

        FROM existencias

        GROUP BY id_producto
    ) e
        ON e.id_producto = p.id_producto

    WHERE p.activo = 1
`;

/* ==========================================
   FORMATEAR PRODUCTOS PARA LA WEB
========================================== */

function shape(row) {

    const specs = parseProductSpecs(
        row.especificaciones_tecnicas
    );

    return {
        ...row,

        id: String(row.id),

        categoryId: String(
            row.categoryId
        ),

        price: Number(row.price),

        stock: Math.max(
            0,
            Math.floor(
                Number(row.stock) || 0
            )
        ),

        brand: row.brand || '',

        description:
            row.description || '',

        image: row.image || '',

        especificaciones_tecnicas: specs,

        specifications: specs
    };
}

/* ==========================================
   CARGAR PRODUCTOS POR ID
========================================== */

async function load(ids) {

    ids = [
        ...new Set(
            (ids || [])
                .map(Number)
                .filter(id =>
                    Number.isSafeInteger(id) &&
                    id > 0
                )
        )
    ];

    if (!ids.length) {
        return [];
    }

    const [rows] = await pool.query(
        `${BASE} AND p.id_producto IN (?)`,
        [ids]
    );

    return rows.map(shape);
}

/* ==========================================
   GALERÍA DE FOTOGRAFÍAS
   HASTA CINCO IMÁGENES POR PRODUCTO
========================================== */

async function incluirGalerias(products) {

    if (!products.length) {
        return [];
    }

    const ids = [
        ...new Set(
            products
                .map(p => Number(p.id))
                .filter(Number.isSafeInteger)
        )
    ];

    if (!ids.length) {
        return products.map(p => ({
            ...p,

            images: p.image
                ? [p.image]
                : []
        }));
    }

    const [rows] = await pool.query(`
        SELECT
            id_producto,
            url_imagen

        FROM imagenes_producto

        WHERE
            id_producto IN (?)
            AND url_imagen IS NOT NULL

        ORDER BY
            id_producto,
            es_principal DESC,
            orden_visual ASC,
            id_imagen ASC
    `, [ids]);

    const byId = new Map(
        ids.map(id => [
            String(id),
            []
        ])
    );

    for (const row of rows) {

        const images = byId.get(
            String(row.id_producto)
        );

        const url = clean(
            row.url_imagen
        );

        if (
            images &&
            url &&
            !images.includes(url)
        ) {
            images.push(url);
        }
    }

    return products.map(p => {

        const images = [
            ...(
                byId.get(
                    String(p.id)
                ) || []
            )
        ];

        if (
            p.image &&
            !images.includes(p.image)
        ) {
            images.unshift(p.image);
        }

        const limited = images.slice(
            0,
            5
        );

        return {
            ...p,

            image:
                limited[0] ||
                p.image ||
                '',

            images: limited
        };
    });
}

/* ==========================================
   RUTAS DEL PANEL ADMINISTRATIVO
========================================== */

app.use(
    '/api/admin',
    createAdminRouter({ pool })
);

/* ==========================================
   API PÚBLICA
========================================== */

const api = express.Router();

/* ==========================================
   CATEGORÍAS
========================================== */

api.get('/categories', handle(async (
    req,
    res
) => {

    const [rows] = await pool.query(`
        SELECT
            id_categoria AS id,
            nombre AS name,
            id_categoria_padre,
            activo

        FROM categorias

        WHERE activo = 1

        ORDER BY nombre
    `);

    res.json(
        rows.map(c => ({
            ...c,

            id: String(c.id),

            id_categoria_padre:
                c.id_categoria_padre == null
                    ? null
                    : String(
                        c.id_categoria_padre
                    )
        }))
    );
}));

/* ==========================================
   MARCAS
========================================== */


/* ==========================================
   MARCAS PÚBLICAS CON LOGOTIPOS
========================================== */

api.get('/brands', handle(async (req, res) => {

    const [rows] = await pool.query(`
        SELECT
            id_marca AS id,
            nombre AS name,
            logo_url AS logo

        FROM marcas

        WHERE activo = 1

        ORDER BY nombre
    `);

    res.json(
        rows.map(marca => ({
            ...marca,

            id: String(marca.id),

            logo: marca.logo || ''
        }))
    );

}));


/* ==========================================
   CATÁLOGO DE PRODUCTOS
========================================== */

api.get('/products', handle(async (
    req,
    res
) => {

    const q = clean(
        req.query.q
    );

    const brand = clean(
        req.query.brand
    );

    const maxPrice = clean(
        req.query.maxPrice
    );

    const sort = clean(
        req.query.sort
    );

    let categoryId = clean(
        req.query.categoryId ||
        req.query.id_categoria
    );

    const categoryName = clean(
        req.query.cat ||
        req.query.categoria
    );

    /* BUSCAR CATEGORÍA POR NOMBRE */

    if (
        !categoryId &&
        categoryName
    ) {
        const [categories] = await pool.query(`
            SELECT id_categoria

            FROM categorias

            WHERE
                nombre = ?
                AND activo = 1

            LIMIT 1
        `, [categoryName]);

        if (!categories.length) {
            return res.json([]);
        }

        categoryId = String(
            categories[0].id_categoria
        );
    }

    const conditions = [];
    const values = [];

    /* FILTRO DE BÚSQUEDA */

    if (q) {

        conditions.push(
            '(p.nombre LIKE ? OR p.sku LIKE ? OR m.nombre LIKE ?)'
        );

        values.push(
            `%${q}%`,
            `%${q}%`,
            `%${q}%`
        );
    }

    /* FILTRO POR CATEGORÍA */

    if (categoryId) {

        const id = Number(
            categoryId
        );

        if (
            !Number.isSafeInteger(id) ||
            id <= 0
        ) {
            return res.json([]);
        }

        conditions.push(
            'p.id_categoria = ?'
        );

        values.push(id);
    }

    /* FILTRO POR MARCA */

    if (brand) {

        conditions.push(
            'm.nombre = ?'
        );

        values.push(brand);
    }

    /* FILTRO DE PRECIO */

    if (maxPrice !== '') {

        const max = Number(
            maxPrice
        );

        if (
            !Number.isFinite(max) ||
            max < 0
        ) {
            return res.json([]);
        }

        conditions.push(
            'p.precio <= ?'
        );

        values.push(max);
    }

    /* ORDENAMIENTO */

    const order = {
        'precio-asc':
            'p.precio ASC',

        'precio-desc':
            'p.precio DESC',

        nombre:
            'p.nombre ASC'
    }[sort] ||
        'p.fecha_creacion DESC, p.id_producto DESC';

    const extra = conditions.length
        ? ` AND ${conditions.join(' AND ')}`
        : '';

    /* CONSULTAR PRODUCTOS EN MYSQL */

    const [rows] = await pool.query(
        `${BASE} ${extra} ORDER BY ${order}`,
        values
    );

    /* NORMALIZAR LAS ESPECIFICACIONES */

    const products = rows.map(
        shape
    );

    /* INCLUIR HASTA CINCO FOTOS */

    const result = await incluirGalerias(
        products
    );

    res.json(result);
}));

/* ==========================================
   DETALLE COMPLETO DEL PRODUCTO

   INCLUYE:
   - DATOS GENERALES
   - ESPECIFICACIONES TÉCNICAS
   - HASTA CINCO FOTOGRAFÍAS
========================================== */

api.get('/products/:id', handle(async (
    req,
    res
) => {

    const id = Number(
        req.params.id
    );

    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return res.status(400).json({
            error: 'ID de producto inválido'
        });
    }

    /* OBTENER PRODUCTO */

    const [product] = await load([
        id
    ]);

    if (!product) {
        return res.status(404).json({
            error: 'Producto no encontrado'
        });
    }

    /* OBTENER SUS FOTOGRAFÍAS */

    const [result] = await incluirGalerias([
        product
    ]);

    /* ENVIAR LOS DATOS A LA PÁGINA WEB */

    res.json(result);
}));

/* ==========================================
   FOTOGRAFÍAS DE UN PRODUCTO
========================================== */

api.get('/products/:id/images', handle(async (
    req,
    res
) => {

    const id = Number(
        req.params.id
    );

    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        return res.status(400).json({
            error: 'ID de producto inválido'
        });
    }

    const [product] = await load([
        id
    ]);

    if (!product) {
        return res.status(404).json({
            error: 'Producto no encontrado'
        });
    }

    const [result] = await incluirGalerias([
        product
    ]);

    res.json({
        images: result.images
    });
}));

/* ==========================================
   CÁLCULO DEL CARRITO
========================================== */

api.post('/pricing', handle(async (
    req,
    res
) => {

    const lines = Array.isArray(
        req.body?.lines
    )
        ? req.body.lines
        : [];

    const products = await load(
        lines.map(line =>
            line.productId
        )
    );

    res.json(
        priceCart(
            lines,
            products
        )
    );
}));

/* ==========================================
   INFORMACIÓN PÚBLICA DE CLIENTES
========================================== */

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

function startSession(
    req,
    res,
    user
) {

    sessions.delete(
        req.sid
    );

    const sid = crypto.randomBytes(16)
        .toString('hex');

    sessions.set(sid, {
        user
    });

    res.setHeader(
        'Set-Cookie',
        `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`
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
    hash
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

            VALUES (
                ?, ?, ?, ?, 'CLIENTE'
            )
        `, [
            name,
            surname,
            mail,
            hash
        ]);

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

    const email = 'prueba@ejemplo.com';

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

api.post('/auth/logout', (
    req,
    res
) => {

    req.s.user = null;

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

api.post('/auth/google', handle(async (
    req,
    res
) => {

    if (!googleClient) {
        return res.status(501).json({
            error:
                'Inicio con Google no configurado (falta GOOGLE_CLIENT_ID)'
        });
    }

    if (limited(req)) {
        return res.status(429).json({
            error:
                'Demasiados intentos. Espera unos minutos.'
        });
    }

    let payload;

    try {
        const ticket =
            await googleClient.verifyIdToken({
                idToken: String(
                    req.body?.credential || ''
                ),

                audience:
                    GOOGLE_CLIENT_ID
            });

        payload = ticket.getPayload();

    } catch {
        return res.status(401).json({
            error:
                'Token de Google inválido'
        });
    }

    if (
        !payload?.email ||
        !payload.email_verified
    ) {
        return res.status(401).json({
            error:
                'Tu correo de Google no está verificado'
        });
    }

    const mail = payload.email.toLowerCase();

    let user = await findUser(
        mail
    );

    if (
        user &&
        (
            !user.activo ||
            user.rol !== 'CLIENTE'
        )
    ) {
        return res.status(403).json({
            error:
                'Esta cuenta no puede entrar a la tienda'
        });
    }

    if (!user) {

        const nombre = clean(
            payload.given_name ||
            payload.name
        ) || 'Cliente';

        const id = await newUser(
            nombre,

            clean(
                payload.family_name
            ) || '-',

            mail,

            '!GOOGLE'
        );

        user = {
            id,
            nombre,
            correo: mail
        };
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

const PAYMENT_METHOD = {
    tarjeta: 'TARJETA',

    transferencia: 'TRANSFERENCIA',

    tienda: 'EFECTIVO'
};

const ORDER_STATES = {
    PENDIENTE:
        'Pendiente de confirmación',

    CONFIRMADO:
        'Confirmado',

    PREPARANDO:
        'En preparación',

    ENVIADO:
        'Enviado',

    ENTREGADO:
        'Entregado',

    CANCELADO:
        'Cancelado'
};

const DEMO =
    'PEDIDO DE DEMOSTRACIÓN';

/* ==========================================
   FORMATO DE PEDIDOS
========================================== */

function orderResponse(
    order,
    items
) {

    const demo = String(
        order.observaciones || ''
    ).startsWith(DEMO);

    return {
        id: `PED-${order.id_pedido}`,

        isDemo: demo,

        createdAt:
            order.fecha_pedido,

        total: Number(
            order.total
        ),

        paymentStatus:
            'pendiente_de_integracion',

        status:
            demo &&
            order.estado === 'PENDIENTE'
                ? 'Pedido de demostración creado; pago pendiente de integración'
                : ORDER_STATES[order.estado],

        items: items.map(i => ({
            name: i.nombre,

            quantity: Number(
                i.cantidad
            ),

            subtotal: Number(
                i.subtotal
            )
        }))
    };
}

/* ==========================================
   CREAR PEDIDO
========================================== */

api.post('/orders', handle(async (
    req,
    res
) => {

    if (
        !req.s.user ||
        (
            req.s.user.rol &&
            req.s.user.rol !== 'CLIENTE'
        )
    ) {
        return res.status(401).json({
            error:
                'Inicia sesión como cliente para crear un pedido de demostración'
        });
    }

    const {
        customer = {},
        address = {},
        delivery,
        paymentMethod,
        lines
    } = req.body || {};

    const invalid = [];

    /* VALIDAR CLIENTE */

    if (
        clean(customer.name).length < 3
    ) {
        invalid.push('name');
    }

    if (!emailOk(customer.email)) {
        invalid.push('email');
    }

    /* VALIDAR DIRECCIÓN */

    for (const key of [
        'calle',
        'numeroExterior',
        'colonia',
        'codigoPostal',
        'ciudad',
        'estado'
    ]) {
        if (!clean(address[key])) {
            invalid.push(key);
        }
    }

    /* VALIDAR MÉTODO DE PAGO */

    if (
        !PAYMENT_METHOD[
            paymentMethod
        ]
    ) {
        invalid.push('paymentMethod');
    }

    /* VALIDAR ENTREGA */

    if (
        ![
            'domicilio',
            'sucursal'
        ].includes(delivery)
    ) {
        invalid.push('delivery');
    }

    /* VALIDAR CARRITO */

    if (
        !Array.isArray(lines) ||
        !lines.length ||
        lines.length > 50
    ) {
        invalid.push('lines');
    }

    if (invalid.length) {
        return res.status(400).json({
            error: 'Datos inválidos',

            fields: invalid
        });
    }

    const want = new Map(
        lines.map(line => [
            String(line.productId),
            Number(line.quantity)
        ])
    );

    if (
        want.size !== lines.length ||
        [...want.values()].some(q =>
            !Number.isInteger(q) ||
            q < 1
        )
    ) {
        return res.status(400).json({
            error:
                'Cantidades inválidas o productos duplicados'
        });
    }

    /* CONSULTAR PRODUCTOS */

    const products = await load(
        lines.map(line =>
            line.productId
        )
    );

    const total = priceCart(
        lines,
        products
    );

    const unavailable =
        total.items.length !== want.size ||
        total.items.some(item =>
            item.quantity !== want.get(
                String(item.productId)
            )
        );

    if (unavailable) {
        return res.status(409).json({
            error:
                'Algún producto no existe o no tiene existencias suficientes'
        });
    }

    /* CREAR PEDIDO DEMOSTRATIVO */

    const observations = `
        ${DEMO}.
        Pago pendiente de integración.
        Entrega: ${delivery}.
        Contacto: ${clean(customer.name)}
        <${clean(customer.email)}>
    `.trim().slice(0, 500);

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        const [result] = await conn.query(`
            INSERT INTO pedidos (
                id_usuario,
                subtotal,
                costo_envio,
                total,
                estado,
                metodo_pago,
                observaciones,
                domicilio_calle,
                domicilio_numero_exterior,
                domicilio_numero_interior,
                domicilio_colonia,
                domicilio_codigo_postal,
                domicilio_ciudad,
                domicilio_estado,
                domicilio_referencias
            )

            VALUES (
                ?, ?, ?, ?, 'PENDIENTE',
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `, [
            req.s.user.id,

            total.subtotal,
            total.shipping,
            total.total,

            PAYMENT_METHOD[paymentMethod],

            observations,

            clean(address.calle),

            clean(address.numeroExterior),

            clean(address.numeroInterior) ||
                null,

            clean(address.colonia),

            clean(address.codigoPostal),

            clean(address.ciudad),

            clean(address.estado),

            clean(address.referencias) ||
                null
        ]);

        /* GUARDAR DETALLES DEL PEDIDO */

        for (const item of total.items) {

            await conn.query(`
                INSERT INTO detalle_pedido (
                    id_pedido,
                    id_producto,
                    cantidad,
                    precio_unitario,
                    subtotal
                )

                VALUES (?, ?, ?, ?, ?)
            `, [
                result.insertId,

                Number(item.productId),

                item.quantity,

                item.unitPrice,

                item.subtotal
            ]);
        }

        await conn.commit();

        res.status(201).json(
            orderResponse(
                {
                    id_pedido:
                        result.insertId,

                    fecha_pedido:
                        new Date(),

                    total:
                        total.total,

                    estado:
                        'PENDIENTE',

                    observaciones:
                        observations
                },

                total.items.map(item => ({
                    nombre: item.name,

                    cantidad:
                        item.quantity,

                    subtotal:
                        item.subtotal
                }))
            )
        );

    } catch (error) {

        await conn.rollback();

        throw error;

    } finally {

        conn.release();
    }
}));

/* ==========================================
   LISTAR PEDIDOS DEL CLIENTE
========================================== */

api.get('/orders', handle(async (
    req,
    res
) => {

    if (
        !req.s.user ||
        (
            req.s.user.rol &&
            req.s.user.rol !== 'CLIENTE'
        )
    ) {
        return res.json([]);
    }

    const [orders] = await pool.query(`
        SELECT
            id_pedido,
            fecha_pedido,
            total,
            estado,
            observaciones

        FROM pedidos

        WHERE id_usuario = ?

        ORDER BY
            fecha_pedido DESC,
            id_pedido DESC
    `, [
        req.s.user.id
    ]);

    const ids = orders.map(o =>
        o.id_pedido
    );

    const [details] = ids.length
        ? await pool.query(`
            SELECT
                d.id_pedido,
                d.cantidad,
                d.subtotal,
                p.nombre

            FROM detalle_pedido d

            JOIN productos p
                ON p.id_producto =
                    d.id_producto

            WHERE d.id_pedido IN (?)
        `, [ids])
        : [[]];

    res.json(
        orders.map(order =>
            orderResponse(
                order,

                details.filter(item =>
                    Number(
                        item.id_pedido
                    ) === Number(
                        order.id_pedido
                    )
                )
            )
        )
    );
}));

/* ==========================================
   PASARELA DE PAGO
========================================== */

api.post('/payments/session', (
    req,
    res
) => {

    res.status(501).json({
        error:
            'Pasarela de pago pendiente de integración'
    });
});

/* ==========================================
   REGISTRAR RUTAS PÚBLICAS
========================================== */

app.use(
    '/api',
    api
);

app.use('/api', (
    req,
    res
) => {

    res.status(404).json({
        error: 'Ruta no encontrada'
    });
});

/* ==========================================
   ARCHIVOS ESTÁTICOS
========================================== */

app.use(
    express.static('public')
);

app.get('*', (
    req,
    res
) => {

    res.sendFile(
        'index.html',
        {
            root: 'public'
        }
    );
});

/* ==========================================
   INICIAR SERVIDOR
========================================== */

app.listen(PORT, () => {

    console.log(
        `FerreMax en http://localhost:${PORT}`
    );
});
