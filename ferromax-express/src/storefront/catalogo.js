import { pool } from '../../db.js';
import { priceCart } from '../../pricing.js';
import { clean, handle } from './helpers.js';

export function registrarCatalogo(api) {
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

return { load };
}
