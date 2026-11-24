
import { registrarAccesoGoogle } from './acceso-google.js';
import express from 'express';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { createSuppliersRouter } from './suppliers-router.js';
import { googleClientIdPersonal, verificarGoogleMovil } from './personal-google.js';
// ALMACENAMIENTO DE IMÁGENES EN RAILWAY
import {
    guardarImagen,
    leerImagen,
    borrarImagen
} from '../storage/imagenes.js';

const clean = value => String(value ?? '').trim();

const ROLES = [
    'ADMINISTRADOR',
    'EDITOR',
    'INVENTARIO'
];

const UNIDADES = [
    'PIEZA',
    'KG',
    'METRO',
    'LITRO',
    'CAJA',
    'BULTO',
    'PAQUETE'
];

const MAX_FOTOS = 5;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const FOTO_RE =
    /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i;

const validId = value =>
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;

const publicUser = user => ({
    id: user.id,
    nombre: user.nombre,
    apellido_paterno: user.apellido_paterno,
    apellido_materno: user.apellido_materno || '',
    correo: user.correo,
    rol: user.rol,
    foto_perfil: user.foto_perfil || ''
});

/* ==========================================
   ESPECIFICACIONES TÉCNICAS
========================================== */

function prepararEspecificaciones(body = {}) {
    const claves = [
        'especificaciones_tecnicas',
        'specifications',
        'especificacionesTecnicas',
        'especificaciones',
        'specs'
    ];

    const clave = claves.find(k =>
        Object.prototype.hasOwnProperty.call(body, k)
    );

    if (!clave) {
        return {
            proporcionadas: false,
            json: null,
            items: []
        };
    }

    let datos = body[clave];

    if (datos == null || datos === '') {
        datos = [];
    }

    if (typeof datos === 'string') {
        try {
            datos = JSON.parse(datos);
        } catch {
            datos = datos
                .split(/\r?\n/)
                .map(x => x.trim())
                .filter(Boolean);
        }
    }

    if (
        datos &&
        typeof datos === 'object' &&
        !Array.isArray(datos)
    ) {
        datos = Array.isArray(datos.items)
            ? datos.items
            : Array.isArray(datos.especificaciones)
                ? datos.especificaciones
                : Object.entries(datos).map(
                    ([caracteristica, valor]) => ({
                        caracteristica,
                        valor
                    })
                );
    }

    if (!Array.isArray(datos) || datos.length > 30) {
        return {
            error:
                'Debes enviar una lista de máximo 30 especificaciones técnicas.'
        };
    }

    const items = [];

    for (const dato of datos) {
        let caracteristica = '';
        let valor = '';

        if (Array.isArray(dato)) {
            caracteristica = clean(dato[0]);
            valor = clean(dato[1]);
        } else if (typeof dato === 'string') {
            const partes = dato.match(
                /^(.+?)\s*(?:[:：|–—]|\s+-\s+)\s*(.+)$/
            );

            if (!partes) {
                return {
                    error:
                        'Escribe las especificaciones como "Característica: Valor".'
                };
            }

            caracteristica = clean(partes[1]);
            valor = clean(partes[2]);
        } else if (dato && typeof dato === 'object') {
            caracteristica = clean(
                dato.caracteristica ??
                dato.concepto ??
                dato.nombre ??
                dato.name ??
                dato.label ??
                dato.clave
            );

            valor = clean(
                dato.valor ??
                dato.medida ??
                dato.value
            );
        } else {
            return {
                error:
                    'Formato inválido de especificaciones técnicas.'
            };
        }

        if (!caracteristica && !valor) {
            continue;
        }

        if (
            !caracteristica ||
            !valor ||
            caracteristica.length > 80 ||
            valor.length > 250
        ) {
            return {
                error:
                    'Cada especificación necesita una característica (máx. 80) y un valor (máx. 250).'
            };
        }

        items.push({
            caracteristica,
            valor
        });
    }

    return {
        proporcionadas: true,
        json: JSON.stringify(items),
        items
    };
}

function leerEspecificaciones(valor) {
    if (valor == null || valor === '') {
        return [];
    }

    try {
        const dato = typeof valor === 'string'
            ? JSON.parse(valor)
            : valor;

        return Array.isArray(dato) ? dato : [];
    } catch {
        return [];
    }
}

/* ==========================================
   VALIDACIÓN DE STOCK
========================================== */

function validProductStock(raw) {
    if (
        raw === undefined ||
        raw === null ||
        String(raw).trim() === ''
    ) {
        return false;
    }

    const n = Number(raw);

    return (
        Number.isFinite(n) &&
        n >= 0 &&
        n <= 99999999 &&
        Math.abs(Math.round(n * 1000) - n * 1000) < 0.00001
    );
}

/* ==========================================
   VALIDACIÓN DE FOTOGRAFÍAS
========================================== */

function productPhotoPayload(body = {}) {
    const files = Array.isArray(body.imagenes)
        ? body.imagenes
        : body.imagen
            ? [body.imagen]
            : [];

    if (files.length > MAX_FOTOS) {
        return {
            error: `Máximo ${MAX_FOTOS} fotografías por producto.`,
            files: []
        };
    }

    for (const foto of files) {
        const match = FOTO_RE.exec(String(foto));

        if (!match) {
            return {
                error:
                    'Solo se permiten fotografías JPG, PNG y WEBP en base64.',
                files: []
            };
        }

        if (
            Buffer.byteLength(match[2], 'base64') >
            MAX_FOTO_BYTES
        ) {
            return {
                error:
                    'Cada fotografía debe pesar como máximo 5 MB.',
                files: []
            };
        }
    }

    return { files };
}

/* ==========================================
   GUARDAR IMÁGENES
   LOCAL / RAILWAY STORAGE BUCKET
========================================== */

async function saveImage(data, folder) {
    const match = FOTO_RE.exec(String(data));

    if (!match) {
        const error = new Error('Imagen inválida.');
        error.status = 400;
        throw error;
    }

    const bytes = Buffer.from(match[2], 'base64');

    if (!bytes.length || bytes.length > MAX_FOTO_BYTES) {
        const error = new Error(
            'La imagen debe pesar como máximo 5 MB.'
        );

        error.status = 400;
        throw error;
    }

    const ext = match[1].toLowerCase() === 'jpeg'
        ? 'jpg'
        : match[1].toLowerCase();

    const name =
        `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const url = `/uploads/${folder}/${name}`;

    const mime = ext === 'jpg'
        ? 'image/jpeg'
        : `image/${ext}`;

    // Local: public/uploads/
    // Railway: Storage Bucket
    await guardarImagen(url, bytes, mime);

    return url;
}

/* ==========================================
   ELIMINAR UNA IMAGEN
========================================== */

async function cleanupUploadedFile(url, folder) {
    const pattern = new RegExp(
        `^/uploads/${folder}/[a-zA-Z0-9_.-]+$`
    );

    if (!pattern.test(String(url || ''))) {
        return;
    }

    await borrarImagen(url);
}

/* ==========================================
   ELIMINAR VARIAS IMÁGENES DE PRODUCTOS
========================================== */

async function cleanupProductFiles(urls) {
    for (const url of urls) {
        await cleanupUploadedFile(url, 'products');
    }
}


/* ==========================================
   FOTOGRAFÍAS DE PRODUCTOS
========================================== */

async function saveProductImages(
    conn,
    productId,
    images,
    uploaded
) {
    if (!images.length) {
        return;
    }

    const [[info]] = await conn.query(`
        SELECT
            COUNT(*) AS total,
            COALESCE(MAX(orden_visual), 0) AS ultimo
        FROM imagenes_producto
        WHERE id_producto = ?
    `, [productId]);

    if (Number(info.total) + images.length > MAX_FOTOS) {
        const error = new Error(
            `El producto no puede tener más de ${MAX_FOTOS} fotografías.`
        );

        error.status = 400;
        throw error;
    }

    let order = Number(info.ultimo);
    const hadImages = Number(info.total) > 0;

    for (let i = 0; i < images.length; i++) {
        const url = await saveImage(
            images[i],
            'products'
        );

        uploaded.push(url);

        await conn.query(`
            INSERT INTO imagenes_producto (
                id_producto,
                url_imagen,
                texto_alternativo,
                es_principal,
                orden_visual
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            productId,
            url,
            'Fotografía del producto',
            !hadImages && i === 0 ? 1 : 0,
            ++order
        ]);
    }
}

/* ==========================================
   GENERAR PDF
========================================== */

const pdfEscape = value => String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/([\\()])/g, '\\$1')
    .slice(0, 105);

function makePdf(lines) {
    const stream = [
        'BT',
        '/F1 16 Tf',
        '50 790 Td',
        `(${pdfEscape(
            'FERREMAX - REPORTE DE INVENTARIO'
        )}) Tj`,
        '/F1 10 Tf',
        ...lines.flatMap(line => [
            '0 -22 Td',
            `(${pdfEscape(line)}) Tj`
        ]),
        'ET'
    ].join('\n');

    const objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>
stream
${stream}
endstream`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objs.forEach((obj, i) => {
        offsets.push(
            Buffer.byteLength(pdf, 'latin1')
        );

        pdf += `${i + 1} 0 obj
${obj}
endobj
`;
    });

    const xref = Buffer.byteLength(pdf, 'latin1');

    pdf += `xref
0 6
0000000000 65535 f
`;

    pdf += offsets
        .slice(1)
        .map(x =>
            `${String(x).padStart(10, '0')} 00000 n\n`
        )
        .join('');

    pdf += `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xref}
%%EOF`;

    return Buffer.from(pdf, 'latin1');
}

/* ==========================================
   TOKENS DE LA APLICACIÓN MÓVIL
========================================== */

function sign(payload, secret) {
    const body = Buffer
        .from(JSON.stringify(payload))
        .toString('base64url');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64url');

    return `${body}.${signature}`;
}

function verify(token, secret) {
    try {
        const [body, sig] = String(token).split('.');

        if (!body || !sig) {
            return null;
        }

        const expected = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest();

        const received = Buffer.from(
            sig,
            'base64url'
        );

        if (
            expected.length !== received.length ||
            !crypto.timingSafeEqual(expected, received)
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(body, 'base64url')
                .toString('utf8')
        );

        return Number(payload.exp) > Date.now()
            ? payload
            : null;
    } catch {
        return null;
    }
}

/* ==========================================
   ROUTER ADMINISTRATIVO FERROMAX
========================================== */

export function createAdminRouter({ pool }) {
    const router = express.Router();

    const wrap = fn => (req, res, next) =>
        Promise.resolve()
            .then(() => fn(req, res, next))
            .catch(next);

    const errorResponse = (res, message, status = 400) =>
        res.status(status).json({
            error: message
        });
            router.use(wrap(async (req, res, next) => {
        const usuario = req.s?.user;
        if (!usuario) return next();

        const [[actual]] = await pool.query(`
            SELECT activo, rol, google_sub
            FROM usuarios
            WHERE id_usuario = ?
        `, [usuario.id]);

        if (
            !actual?.activo ||
            actual.rol !== usuario.rol ||
            (usuario.googleSub && actual.google_sub !== usuario.googleSub)
        ) {
            req.cerrarSesionAdmin();
        }

        next();
    }));

    const limitarAcceso = registrarAccesoGoogle(router, { pool, roles: ROLES, wrap });

    /* ======================================
       AUTENTICACIÓN Y PERMISOS
    ====================================== */

    const requireLogin = (req, res, next) => {
        if (
            req.s?.user &&
            ROLES.includes(req.s.user.rol)
        ) {
            return next();
        }

        return res.status(401).json({
            error:
                'Inicia sesión con una cuenta administrativa.'
        });
    };

/* ==========================================
   CONSULTAR EVIDENCIAS PRIVADAS
========================================== */

router.get(
    '/evidencias/:nombre',
    requireLogin,
    async (req, res, next) => {
        const nombre = String(req.params.nombre || '');

        if (
            !/^[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(nombre)
        ) {
            return res.status(400).json({
                error: 'Nombre de archivo inválido.'
            });
        }

        try {
            const url = `/uploads/reports/${nombre}`;

            // Verificar que la evidencia esté registrada
            // y que pertenezca a una incidencia existente.
            const [rows] = await pool.query(`
                SELECT 1
                FROM evidencias_incidencia
                WHERE url_foto = ?
                LIMIT 1
            `, [url]);

            if (!rows.length) {
                return res.status(404).json({
                    error: 'Evidencia no encontrada.'
                });
            }

            const { bytes, tipo } = await leerImagen(url);

            res.setHeader('Content-Type', tipo);
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            return res.send(bytes);

        } catch (error) {
            if (
                error.name === 'NoSuchKey' ||
                error.name === 'NotFound' ||
                error.code === 'ENOENT'
            ) {
                return res.status(404).json({
                    error: 'Fotografía no encontrada.'
                });
            }

            next(error);
        }
    }
);


    const requireAdmin = (req, res, next) => {
        if (req.s?.user?.rol === 'ADMINISTRADOR') {
            return next();
        }

        return res.status(403).json({
            error:
                'Esta acción requiere permisos de administrador.'
        });
    };

    const requireEditor = (req, res, next) => {
        const rol = req.s?.user?.rol;

        if (!rol) {
            return res.status(401).json({
                error: 'Debes iniciar sesión.'
            });
        }

        if (
            ![
                'ADMINISTRADOR',
                'EDITOR'
            ].includes(rol)
        ) {
            return res.status(403).json({
                error:
                    'No tienes permisos para administrar el catálogo.'
            });
        }

        next();
    };

    const requireInventario = (req, res, next) => {
        const rol = req.s?.user?.rol;

        if (!rol) {
            return res.status(401).json({
                error: 'Debes iniciar sesión.'
            });
        }

        if (
            ![
                'ADMINISTRADOR',
                'INVENTARIO'
            ].includes(rol)
        ) {
            return res.status(403).json({
                error:
                    'No tienes permisos para modificar existencias.'
            });
        }

        next();
    };

    /* ======================================
       PROVEEDORES
       SOLO ADMINISTRADOR
    ====================================== */

    router.use(
        '/suppliers',
        requireLogin,
        requireAdmin,
        createSuppliersRouter({ pool })
    );

    /* ======================================
       MARCAS
       ADMINISTRADOR Y EDITOR
    ====================================== */

    function validarMarca(body = {}) {
        const nombre = clean(body.nombre);
        const descripcion = clean(body.descripcion);

        const categorias = Array.isArray(body.categorias)
            ? [...new Set(body.categorias.map(Number))]
            : [];

        if (
            nombre.length < 2 ||
            nombre.length > 100
        ) {
            return {
                error:
                    'Nombre de marca: de 2 a 100 caracteres.'
            };
        }

        if (descripcion.length > 255) {
            return {
                error:
                    'Descripción: máximo 255 caracteres.'
            };
        }

        if (
            !categorias.length ||
            !categorias.every(validId)
        ) {
            return {
                error:
                    'Selecciona al menos una categoría válida para la marca.'
            };
        }

        if (
            body.logo &&
            !FOTO_RE.test(String(body.logo))
        ) {
            return {
                error:
                    'El logotipo debe ser JPG, PNG o WEBP.'
            };
        }

        if (
            body.quitarLogo === true &&
            body.logo
        ) {
            return {
                error:
                    'No puedes subir y quitar un logotipo a la vez.'
            };
        }

        return {
            nombre,
            descripcion,
            categorias
        };
    }

    async function comprobarCategorias(conn, categorias) {
        const [rows] = await conn.query(`
            SELECT id_categoria
            FROM categorias
            WHERE activo = 1
              AND id_categoria IN (?)
        `, [categorias]);

        if (rows.length !== categorias.length) {
            const error = new Error(
                'Alguna categoría no existe o está desactivada.'
            );

            error.status = 400;
            throw error;
        }
    }

    router.get(
        '/brands',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const [marcas] = await pool.query(`
                SELECT
                    id_marca AS id,
                    nombre,
                    descripcion,
                    logo_url,
                    activo
                FROM marcas
                ORDER BY nombre
            `);

            const [vinculos] = await pool.query(`
                SELECT
                    id_marca,
                    id_categoria
                FROM categoria_marca
            `);

            res.json(
                marcas.map(m => ({
                    ...m,
                    categorias: vinculos
                        .filter(v =>
                            Number(v.id_marca) ===
                            Number(m.id)
                        )
                        .map(v =>
                            Number(v.id_categoria)
                        )
                }))
            );
        })
    );

    router.post(
        '/brands',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const data = validarMarca(req.body);

            if (data.error) {
                return errorResponse(res, data.error);
            }

            const conn = await pool.getConnection();
            let logo = '';

            try {
                await conn.beginTransaction();

                await comprobarCategorias(
                    conn,
                    data.categorias
                );

                if (req.body.logo) {
                    logo = await saveImage(
                        req.body.logo,
                        'brands'
                    );
                }

                const [result] = await conn.query(`
                    INSERT INTO marcas (
                        nombre,
                        descripcion,
                        logo_url,
                        activo
                    )
                    VALUES (?, ?, ?, 1)
                `, [
                    data.nombre,
                    data.descripcion || null,
                    logo || null
                ]);

                for (const categoria of data.categorias) {
                    await conn.query(`
                        INSERT INTO categoria_marca (
                            id_categoria,
                            id_marca
                        )
                        VALUES (?, ?)
                    `, [
                        categoria,
                        result.insertId
                    ]);
                }

                await conn.commit();

                res.status(201).json({
                    id: result.insertId,
                    logo_url: logo,
                    message: 'Marca registrada.'
                });
            } catch (error) {
                await conn.rollback();

                if (logo) {
                    await cleanupUploadedFile(
                        logo,
                        'brands'
                    );
                }

                throw error;
            } finally {
                conn.release();
            }
        })
    );

    router.put(
        '/brands/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (!validId(req.params.id)) {
                return errorResponse(
                    res,
                    'ID inválido.'
                );
            }

            const data = validarMarca(req.body);

            if (data.error) {
                return errorResponse(res, data.error);
            }

            const conn = await pool.getConnection();

            let logoNuevo = '';
            let logoAnterior = '';
            let logoFinal = '';

            try {
                await conn.beginTransaction();

                const [[actual]] = await conn.query(`
                    SELECT
                        logo_url,
                        activo
                    FROM marcas
                    WHERE id_marca = ?
                    FOR UPDATE
                `, [req.params.id]);

                if (!actual) {
                    await conn.rollback();

                    return errorResponse(
                        res,
                        'Marca no encontrada.',
                        404
                    );
                }

                await comprobarCategorias(
                    conn,
                    data.categorias
                );

                logoAnterior = actual.logo_url || '';

                if (req.body.logo) {
                    logoNuevo = await saveImage(
                        req.body.logo,
                        'brands'
                    );
                }

                logoFinal = req.body.quitarLogo === true
                    ? null
                    : (
                        logoNuevo ||
                        logoAnterior ||
                        null
                    );

                const activo =
                    typeof req.body.activo === 'boolean'
                        ? Number(req.body.activo)
                        : Number(actual.activo);

                await conn.query(`
                    UPDATE marcas
                    SET
                        nombre = ?,
                        descripcion = ?,
                        logo_url = ?,
                        activo = ?
                    WHERE id_marca = ?
                `, [
                    data.nombre,
                    data.descripcion || null,
                    logoFinal,
                    activo,
                    req.params.id
                ]);

                await conn.query(`
                    DELETE FROM categoria_marca
                    WHERE id_marca = ?
                `, [req.params.id]);

                for (const categoria of data.categorias) {
                    await conn.query(`
                        INSERT INTO categoria_marca (
                            id_categoria,
                            id_marca
                        )
                        VALUES (?, ?)
                    `, [
                        categoria,
                        req.params.id
                    ]);
                }

                await conn.commit();

                if (
                    logoAnterior &&
                    logoAnterior !== logoFinal
                ) {
                    await cleanupUploadedFile(
                        logoAnterior,
                        'brands'
                    );
                }

                res.json({
                    message: 'Marca actualizada.',
                    logo_url: logoFinal
                });
            } catch (error) {
                await conn.rollback();

                if (logoNuevo) {
                    await cleanupUploadedFile(
                        logoNuevo,
                        'brands'
                    );
                }

                throw error;
            } finally {
                conn.release();
            }
        })
    );

    router.patch(
        '/brands/:id/status',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (
                !validId(req.params.id) ||
                typeof req.body?.activo !== 'boolean'
            ) {
                return errorResponse(
                    res,
                    'ID o estado inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE marcas
                SET activo = ?
                WHERE id_marca = ?
            `, [
                req.body.activo ? 1 : 0,
                req.params.id
            ]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Marca no encontrada.',
                    404
                );
            }

            res.json({
                message: req.body.activo
                    ? 'Marca activada.'
                    : 'Marca desactivada.'
            });
        })
    );

    router.delete(
        '/brands/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (!validId(req.params.id)) {
                return errorResponse(
                    res,
                    'ID inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE marcas
                SET activo = 0
                WHERE id_marca = ?
            `, [req.params.id]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Marca no encontrada.',
                    404
                );
            }

            res.json({
                message: 'Marca desactivada.'
            });
        })
    );

    /* ======================================
       CATEGORÍAS
       ADMINISTRADOR Y EDITOR
    ====================================== */

    router.get(
        '/categories',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const [rows] = await pool.query(`
                SELECT
                    id_categoria AS id,
                    nombre,
                    activo
                FROM categorias
                ORDER BY nombre
            `);

            res.json(rows);
        })
    );

    router.post(
        '/categories',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const nombre = clean(req.body?.nombre);

            if (
                nombre.length < 2 ||
                nombre.length > 100
            ) {
                return errorResponse(
                    res,
                    'Nombre de categoría: de 2 a 100 caracteres.'
                );
            }

            const [result] = await pool.query(`
                INSERT INTO categorias (
                    nombre,
                    activo
                )
                VALUES (?, 1)
            `, [nombre]);

            res.status(201).json({
                id: result.insertId,
                message: 'Categoría registrada.'
            });
        })
    );

    router.put(
        '/categories/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const nombre = clean(req.body?.nombre);

            if (
                !validId(req.params.id) ||
                nombre.length < 2 ||
                nombre.length > 100
            ) {
                return errorResponse(
                    res,
                    'ID o nombre de categoría inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE categorias
                SET nombre = ?
                WHERE id_categoria = ?
            `, [
                nombre,
                req.params.id
            ]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Categoría no encontrada.',
                    404
                );
            }

            res.json({
                message: 'Categoría actualizada.'
            });
        })
    );

    router.patch(
        '/categories/:id/status',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (
                !validId(req.params.id) ||
                typeof req.body?.activo !== 'boolean'
            ) {
                return errorResponse(
                    res,
                    'ID o estado inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE categorias
                SET activo = ?
                WHERE id_categoria = ?
            `, [
                req.body.activo ? 1 : 0,
                req.params.id
            ]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Categoría no encontrada.',
                    404
                );
            }

            res.json({
                message: req.body.activo
                    ? 'Categoría activada.'
                    : 'Categoría desactivada.'
            });
        })
    );

    router.delete(
        '/categories/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (!validId(req.params.id)) {
                return errorResponse(
                    res,
                    'ID inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE categorias
                SET activo = 0
                WHERE id_categoria = ?
            `, [req.params.id]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Categoría no encontrada.',
                    404
                );
            }

            res.json({
                message: 'Categoría desactivada.'
            });
        })
    );

    /* ======================================
       USUARIO ACTUAL
    ====================================== */

    const current = wrap(async (req, res) => {
        if (!req.s?.user) {
            return res.json(null);
        }

        const [[user]] = await pool.query(`
            SELECT
                id_usuario AS id,
                nombre,
                apellido_paterno,
                apellido_materno,
                correo,
                rol,
                foto_perfil
            FROM usuarios
            WHERE id_usuario = ?
              AND activo = 1
        `, [req.s.user.id]);

        res.json(
            user ? publicUser(user) : null
        );
    });

    /* ======================================
       LOGIN ADMINISTRATIVO
    ====================================== */

    router.post(
        '/login',
        limitarAcceso,
        wrap(async (req, res) => {
            const email = clean(
                req.body?.email
            ).toLowerCase();

            const password = String(
                req.body?.password || ''
            );

            const [[user]] = await pool.query(`
                SELECT
                    id_usuario AS id,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    correo,
                    password_hash,
                    rol,
                    activo,
                    foto_perfil
                FROM usuarios
                WHERE correo = ?
            `, [email]);

            const valid =
                user?.activo &&
                ROLES.includes(user.rol) &&
                typeof user.password_hash === 'string' &&
                user.password_hash.startsWith('$2') &&
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (!valid) {
                return errorResponse(
                    res,
                    'Correo o contraseña incorrectos.',
                    401
                );
            }

                req.iniciarSesionAdmin({
                id: user.id,
                name: user.nombre,
                email: user.correo,
                rol: user.rol
            });

            res.json(publicUser(user));
        })
    );

    router.get('/me', current);

        router.post('/logout', (req, res) => {
        req.cerrarSesionAdmin();
        res.status(204).end();
    });

    /* ======================================
       DASHBOARD
    ====================================== */

    router.get(
        '/dashboard',
        requireLogin,
        wrap(async (req, res) => {
            const esAdmin =
                req.s.user.rol === 'ADMINISTRADOR';

            const [[products]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM productos
                WHERE activo = 1
            `);

            const [[users]] = esAdmin
                ? await pool.query(`
                    SELECT COUNT(*) AS total
                    FROM usuarios
                    WHERE activo = 1
                      AND rol IN ('EDITOR', 'INVENTARIO')
                `)
                : [[{ total: 0 }]];

            const [[pending]] = esAdmin
                ? await pool.query(`
                    SELECT COUNT(*) AS total
                    FROM incidencias_inventario
                    WHERE estado IN (
                        'PENDIENTE',
                        'EN_REVISION'
                    )
                `)
                : [[{ total: 0 }]];

            const [[outOfStock]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM productos p
                LEFT JOIN (
                    SELECT
                        id_producto,
                        SUM(existencia_actual) AS stock
                    FROM existencias
                    GROUP BY id_producto
                ) e
                    ON e.id_producto = p.id_producto
                WHERE p.activo = 1
                  AND COALESCE(e.stock, 0) <= 0
            `);

            const [[today]] = esAdmin
                ? await pool.query(`
                    SELECT
                        COUNT(*) AS orders,
                        COALESCE(SUM(total), 0) AS amount
                    FROM pedidos
                    WHERE fecha_pedido >= CURDATE()
                      AND fecha_pedido <
                          CURDATE() + INTERVAL 1 DAY
                      AND estado <> 'CANCELADO'
                `)
                : [[{ orders: 0, amount: 0 }]];

            const [topProducts] = esAdmin
                ? await pool.query(`
                    SELECT
                        p.id_producto AS id,
                        p.nombre,
                        p.sku,
                        SUM(d.cantidad) AS unidades,
                        SUM(d.subtotal) AS importe
                    FROM detalle_pedido d
                    JOIN pedidos pe
                        ON pe.id_pedido = d.id_pedido
                    JOIN productos p
                        ON p.id_producto = d.id_producto
                    WHERE pe.estado <> 'CANCELADO'
                    GROUP BY
                        p.id_producto,
                        p.nombre,
                        p.sku
                    ORDER BY
                        unidades DESC,
                        importe DESC
                    LIMIT 5
                `)
                : [[]];

            const [salesByHour] = esAdmin
                ? await pool.query(`
                    SELECT
                        HOUR(fecha_pedido) AS hora,
                        COUNT(*) AS pedidos,
                        COALESCE(SUM(total), 0) AS total
                    FROM pedidos
                    WHERE fecha_pedido >= CURDATE()
                      AND fecha_pedido <
                          CURDATE() + INTERVAL 1 DAY
                      AND estado <> 'CANCELADO'
                    GROUP BY HOUR(fecha_pedido)
                    ORDER BY hora
                `)
                : [[]];

            const [recent] = esAdmin
                ? await pool.query(`
                    SELECT
                        i.id_incidencia AS id,
                        i.tipo_incidencia AS tipo,
                        i.prioridad,
                        i.estado,
                        i.fecha_reporte AS fecha,
                        u.nombre AS empleado
                    FROM incidencias_inventario i
                    JOIN usuarios u
                        ON u.id_usuario = i.id_usuario
                    ORDER BY i.fecha_reporte DESC
                    LIMIT 6
                `)
                : [[]];

            res.json({
                products: Number(products.total),
                staff: Number(users.total),
                pendingReports: Number(pending.total),
                outOfStock: Number(outOfStock.total),
                today: {
                    orders: Number(today.orders),
                    amount: Number(today.amount)
                },
                topProducts: topProducts.map(p => ({
                    ...p,
                    unidades: Number(p.unidades),
                    importe: Number(p.importe)
                })),
                salesByHour: salesByHour.map(h => ({
                    hora: Number(h.hora),
                    pedidos: Number(h.pedidos),
                    total: Number(h.total)
                })),
                recent
            });
        })
    );

    /* ======================================
       USUARIOS Y ROLES
       SOLO ADMINISTRADOR
    ====================================== */

    router.get(
        '/users',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const [rows] = await pool.query(`
                SELECT
                    id_usuario AS id,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    correo,
                    rol,
                    activo,
                    foto_perfil,
                    fecha_creacion
                FROM usuarios
                WHERE rol IN (
                    'ADMINISTRADOR',
                    'EDITOR',
                    'INVENTARIO'
                )
                ORDER BY fecha_creacion DESC
            `);

            res.json(rows);
        })
    );

    router.post(
        '/users',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const {
                nombre,
                apellido_paterno,
                apellido_materno,
                correo,
                password,
                rol
            } = req.body || {};

            if (
                clean(nombre).length < 2 ||
                clean(apellido_paterno).length < 2 ||
                !/^\S+@\S+\.\S+$/.test(clean(correo)) ||
                String(password || '').length < 8 ||
                !ROLES.includes(rol)
            ) {
                return errorResponse(
                    res,
                    'Completa los datos. La contraseña debe tener al menos 8 caracteres.'
                );
            }

            const conn = await pool.getConnection();

            try {
                await conn.beginTransaction();

                const [result] = await conn.query(`
                    INSERT INTO usuarios (
                        nombre,
                        apellido_paterno,
                        apellido_materno,
                        correo,
                        password_hash,
                        rol,
                        creado_por_admin
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    clean(nombre),
                    clean(apellido_paterno),
                    clean(apellido_materno) || null,
                    clean(correo).toLowerCase(),
                    await bcrypt.hash(password, 10),
                    rol,
                    req.s.user.id
                ]);

                if (rol === 'ADMINISTRADOR') {
                    await conn.query(`
                        INSERT INTO administradores (
                            id_usuario
                        )
                        VALUES (?)
                    `, [result.insertId]);
                }

                await conn.commit();

                res.status(201).json({
                    id: result.insertId,
                    message: 'Usuario creado.'
                });
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        })
    );

    router.patch(
        '/users/:id',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const {
                nombre,
                apellido_paterno,
                apellido_materno,
                rol,
                activo
            } = req.body || {};

            const id = Number(req.params.id);

            if (
                !validId(id) ||
                !ROLES.includes(rol) ||
                clean(nombre).length < 2 ||
                clean(apellido_paterno).length < 2 ||
                typeof activo !== 'boolean'
            ) {
                return errorResponse(
                    res,
                    'Datos inválidos.'
                );
            }

            if (
                id === Number(req.s.user.id) &&
                (
                    !activo ||
                    rol !== 'ADMINISTRADOR'
                )
            ) {
                return errorResponse(
                    res,
                    'No puedes quitarte tus propios permisos de administración.'
                );
            }

            const conn = await pool.getConnection();

            try {
                await conn.beginTransaction();

                const [result] = await conn.query(`
                    UPDATE usuarios
                    SET
                        nombre = ?,
                        apellido_paterno = ?,
                        apellido_materno = ?,
                        rol = ?,
                        activo = ?
                    WHERE id_usuario = ?
                `, [
                    clean(nombre),
                    clean(apellido_paterno),
                    clean(apellido_materno) || null,
                    rol,
                    activo ? 1 : 0,
                    id
                ]);

                if (!result.affectedRows) {
                    await conn.rollback();

                    return errorResponse(
                        res,
                        'Usuario no encontrado.',
                        404
                    );
                }

                if (rol === 'ADMINISTRADOR') {
                    await conn.query(`
                        INSERT IGNORE INTO administradores (
                            id_usuario
                        )
                        VALUES (?)
                    `, [id]);
                }

                await conn.commit();

                res.json({
                    message: 'Usuario actualizado.'
                });
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }
        })
    );

    /* ======================================
       PRODUCTOS
       ADMINISTRADOR Y EDITOR
    ====================================== */

    router.get(
        '/products',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const [rows] = await pool.query(`
                SELECT
                    p.id_producto AS id,
                    p.sku,
                    p.nombre,
                    p.descripcion,
                    p.especificaciones_tecnicas,
                    p.precio,
                    p.id_categoria,
                    c.nombre AS categoria,
                    p.id_marca,
                    m.nombre AS marca,
                    p.unidad_venta,
                    p.activo,
                    (
                        SELECT i.url_imagen
                        FROM imagenes_producto i
                        WHERE i.id_producto = p.id_producto
                        ORDER BY
                            i.es_principal DESC,
                            i.orden_visual,
                            i.id_imagen
                        LIMIT 1
                    ) AS imagen,
                    COALESCE(
                        (
                            SELECT SUM(e.existencia_actual)
                            FROM existencias e
                            WHERE e.id_producto = p.id_producto
                        ),
                        0
                    ) AS stock
                FROM productos p
                JOIN categorias c
                    ON c.id_categoria = p.id_categoria
                LEFT JOIN marcas m
                    ON m.id_marca = p.id_marca
                ORDER BY p.fecha_creacion DESC
            `);

            res.json(
                rows.map(p => ({
                    ...p,
                    specifications:
                        leerEspecificaciones(
                            p.especificaciones_tecnicas
                        )
                }))
            );
        })
    );

    /* ======================================
       OPCIONES DEL CATÁLOGO
    ====================================== */

    router.get(
        '/catalog-options',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const [categories] = await pool.query(`
                SELECT
                    id_categoria AS id,
                    nombre
                FROM categorias
                WHERE activo = 1
                ORDER BY nombre
            `);

            const [brands] = await pool.query(`
                SELECT
                    id_marca AS id,
                    nombre
                FROM marcas
                WHERE activo = 1
                ORDER BY nombre
            `);

            const [relations] = await pool.query(`
                SELECT
                    cm.id_categoria AS categoryId,
                    cm.id_marca AS brandId
                FROM categoria_marca cm
                JOIN categorias c
                    ON c.id_categoria = cm.id_categoria
                JOIN marcas m
                    ON m.id_marca = cm.id_marca
                WHERE c.activo = 1
                  AND m.activo = 1
            `);

            res.json({
                categories,
                brands,
                relations
            });
        })
    );

    /* ======================================
       FOTOGRAFÍAS DE PRODUCTOS
    ====================================== */

    router.get(
        '/products/:id/images',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const [images] = await pool.query(`
                SELECT
                    id_imagen AS id,
                    url_imagen AS url,
                    es_principal
                FROM imagenes_producto
                WHERE id_producto = ?
                ORDER BY
                    es_principal DESC,
                    orden_visual,
                    id_imagen
            `, [req.params.id]);

            res.json(images);
        })
    );

    /* ======================================
       CREAR PRODUCTO
       EDITOR NO PUEDE ASIGNAR STOCK
    ====================================== */

    router.post(
        '/products',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const {
                sku,
                nombre,
                descripcion,
                id_categoria,
                id_marca,
                precio,
                unidad_venta
            } = req.body || {};

            const esEditor =
                req.s.user.rol === 'EDITOR';

            const stock = esEditor
                ? 0
                : Number(req.body?.stock);

            const photos = productPhotoPayload(
                req.body
            );

            const specs = prepararEspecificaciones(
                req.body
            );

            if (specs.error) {
                return errorResponse(
                    res,
                    specs.error
                );
            }

            if (photos.error) {
                return errorResponse(
                    res,
                    photos.error
                );
            }

            if (
                !clean(sku) ||
                !clean(nombre) ||
                !validId(id_categoria) ||
                !Number.isFinite(Number(precio)) ||
                Number(precio) < 0 ||
                (
                    !esEditor &&
                    !validProductStock(req.body.stock)
                )
            ) {
                return errorResponse(
                    res,
                    'Completa SKU, nombre, categoría, precio y stock válido.'
                );
            }

            if (
                !UNIDADES.includes(
                    unidad_venta || 'PIEZA'
                )
            ) {
                return errorResponse(
                    res,
                    'Unidad de venta inválida.'
                );
            }

            const conn = await pool.getConnection();
            const uploaded = [];

            try {
                await conn.beginTransaction();

                const [result] = await conn.query(`
                    INSERT INTO productos (
                        sku,
                        nombre,
                        descripcion,
                        especificaciones_tecnicas,
                        id_categoria,
                        id_marca,
                        precio,
                        unidad_venta
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    clean(sku),
                    clean(nombre),
                    clean(descripcion),
                    specs.json ?? '[]',
                    Number(id_categoria),
                    id_marca
                        ? Number(id_marca)
                        : null,
                    Number(precio),
                    unidad_venta || 'PIEZA'
                ]);

                const id = result.insertId;

                await conn.query(`
                    INSERT INTO existencias (
                        id_producto,
                        existencia_actual,
                        existencia_minima
                    )
                    VALUES (?, ?, 0)
                `, [
                    id,
                    stock
                ]);

                if (stock > 0) {
                    await conn.query(`
                        INSERT INTO movimientos_inventario (
                            id_producto,
                            id_usuario,
                            tipo_movimiento,
                            cantidad,
                            motivo
                        )
                        VALUES (
                            ?,
                            ?,
                            'ENTRADA',
                            ?,
                            'Stock inicial desde el panel administrativo'
                        )
                    `, [
                        id,
                        req.s.user.id,
                        stock
                    ]);
                }

                await saveProductImages(
                    conn,
                    id,
                    photos.files,
                    uploaded
                );

                await conn.commit();

                res.status(201).json({
                    id,
                    message:
                        'Producto registrado correctamente.'
                });
            } catch (error) {
                await conn.rollback();

                await cleanupProductFiles(
                    uploaded
                );

                throw error;
            } finally {
                conn.release();
            }
        })
    );

    /* ======================================
       ACTUALIZAR PRODUCTO
       EDITOR CONSERVA STOCK EXISTENTE
    ====================================== */

    router.put(
        '/products/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const {
                sku,
                nombre,
                descripcion,
                id_categoria,
                id_marca,
                precio,
                unidad_venta,
                activo
            } = req.body || {};

            const id = Number(req.params.id);

            const esEditor =
                req.s.user.rol === 'EDITOR';

            const stock = esEditor
                ? null
                : Number(req.body?.stock);

            const photos = productPhotoPayload(
                req.body
            );

            const specs = prepararEspecificaciones(
                req.body
            );

            if (specs.error) {
                return errorResponse(
                    res,
                    specs.error
                );
            }

            if (photos.error) {
                return errorResponse(
                    res,
                    photos.error
                );
            }

            if (
                !validId(id) ||
                !clean(sku) ||
                !clean(nombre) ||
                !validId(id_categoria) ||
                !Number.isFinite(Number(precio)) ||
                Number(precio) < 0 ||
                (
                    !esEditor &&
                    !validProductStock(req.body.stock)
                )
            ) {
                return errorResponse(
                    res,
                    'Revisa los datos del producto.'
                );
            }

            if (
                !UNIDADES.includes(
                    unidad_venta || 'PIEZA'
                )
            ) {
                return errorResponse(
                    res,
                    'Unidad de venta inválida.'
                );
            }

            const conn = await pool.getConnection();
            const uploaded = [];

            try {
                await conn.beginTransaction();

                const [[existing]] = await conn.query(`
                    SELECT activo
                    FROM productos
                    WHERE id_producto = ?
                    FOR UPDATE
                `, [id]);

                if (!existing) {
                    await conn.rollback();

                    return errorResponse(
                        res,
                        'Producto no encontrado.',
                        404
                    );
                }

                const [[count]] = await conn.query(`
                    SELECT COUNT(*) AS total
                    FROM imagenes_producto
                    WHERE id_producto = ?
                `, [id]);

                if (
                    Number(count.total) +
                    photos.files.length > MAX_FOTOS
                ) {
                    await conn.rollback();

                    return errorResponse(
                        res,
                        'Máximo cinco fotografías. Elimina una antes de agregar más.'
                    );
                }

                await conn.query(`
                    UPDATE productos
                    SET
                        sku = ?,
                        nombre = ?,
                        descripcion = ?,
                        especificaciones_tecnicas =
                            COALESCE(
                                ?,
                                especificaciones_tecnicas
                            ),
                        id_categoria = ?,
                        id_marca = ?,
                        precio = ?,
                        unidad_venta = ?,
                        activo = ?
                    WHERE id_producto = ?
                `, [
                    clean(sku),
                    clean(nombre),
                    clean(descripcion),
                    specs.json,
                    Number(id_categoria),
                    id_marca
                        ? Number(id_marca)
                        : null,
                    Number(precio),
                    unidad_venta || 'PIEZA',
                    activo === undefined
                        ? existing.activo
                        : (activo ? 1 : 0),
                    id
                ]);

                if (!esEditor) {
                    const [[previous]] = await conn.query(`
                        SELECT
                            COALESCE(
                                SUM(existencia_actual),
                                0
                            ) AS stock
                        FROM existencias
                        WHERE id_producto = ?
                    `, [id]);

                    const stockAnterior = Number(
                        previous?.stock || 0
                    );

                    await conn.query(`
                        INSERT INTO existencias (
                            id_producto,
                            existencia_actual,
                            existencia_minima
                        )
                        VALUES (?, ?, 0)
                        ON DUPLICATE KEY UPDATE
                            existencia_actual =
                                VALUES(existencia_actual)
                    `, [
                        id,
                        stock
                    ]);

                    if (
                        Math.abs(
                            stock - stockAnterior
                        ) > 0.00001
                    ) {
                        await conn.query(`
                            INSERT INTO movimientos_inventario (
                                id_producto,
                                id_usuario,
                                tipo_movimiento,
                                cantidad,
                                motivo
                            )
                            VALUES (
                                ?,
                                ?,
                                'AJUSTE',
                                ?,
                                'Ajuste de stock desde el panel administrativo'
                            )
                        `, [
                            id,
                            req.s.user.id,
                            Math.abs(
                                stock - stockAnterior
                            )
                        ]);
                    }
                }

                await saveProductImages(
                    conn,
                    id,
                    photos.files,
                    uploaded
                );

                await conn.commit();

                res.json({
                    message:
                        'Producto y especificaciones actualizados correctamente.'
                });
            } catch (error) {
                await conn.rollback();

                await cleanupProductFiles(
                    uploaded
                );

                throw error;
            } finally {
                conn.release();
            }
        })
    );

    /* ======================================
       ELIMINAR FOTOGRAFÍA
    ====================================== */

    router.delete(
        '/products/:id/images/:imageId',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            const id = Number(req.params.id);
            const imageId = Number(req.params.imageId);

            if (
                !validId(id) ||
                !validId(imageId)
            ) {
                return errorResponse(
                    res,
                    'Identificador inválido.'
                );
            }

            const conn = await pool.getConnection();
            let fileUrl = '';

            try {
                await conn.beginTransaction();

                const [[photo]] = await conn.query(`
                    SELECT
                        url_imagen,
                        es_principal
                    FROM imagenes_producto
                    WHERE id_imagen = ?
                      AND id_producto = ?
                    FOR UPDATE
                `, [
                    imageId,
                    id
                ]);

                if (!photo) {
                    await conn.rollback();

                    return errorResponse(
                        res,
                        'Fotografía no encontrada.',
                        404
                    );
                }

                fileUrl = photo.url_imagen;

                await conn.query(`
                    DELETE FROM imagenes_producto
                    WHERE id_imagen = ?
                      AND id_producto = ?
                `, [
                    imageId,
                    id
                ]);

                if (photo.es_principal) {
                    const [[nextPhoto]] = await conn.query(`
                        SELECT id_imagen
                        FROM imagenes_producto
                        WHERE id_producto = ?
                        ORDER BY
                            orden_visual,
                            id_imagen
                        LIMIT 1
                    `, [id]);

                    if (nextPhoto) {
                        await conn.query(`
                            UPDATE imagenes_producto
                            SET es_principal = 1
                            WHERE id_imagen = ?
                        `, [
                            nextPhoto.id_imagen
                        ]);
                    }
                }

                await conn.commit();
            } catch (error) {
                await conn.rollback();
                throw error;
            } finally {
                conn.release();
            }

            await cleanupProductFiles([
                fileUrl
            ]);

            res.json({
                message: 'Fotografía eliminada.'
            });
        })
    );

    /* ======================================
       ACTIVAR O DESACTIVAR PRODUCTO
    ====================================== */

    router.patch(
        '/products/:id/status',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (
                !validId(req.params.id) ||
                typeof req.body?.activo !== 'boolean'
            ) {
                return errorResponse(
                    res,
                    'ID o estado inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE productos
                SET activo = ?
                WHERE id_producto = ?
            `, [
                req.body.activo ? 1 : 0,
                req.params.id
            ]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Producto no encontrado.',
                    404
                );
            }

            res.json({
                message: req.body.activo
                    ? 'Producto habilitado.'
                    : 'Producto deshabilitado.'
            });
        })
    );

    router.delete(
        '/products/:id',
        requireLogin,
        requireEditor,
        wrap(async (req, res) => {
            if (!validId(req.params.id)) {
                return errorResponse(
                    res,
                    'ID inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE productos
                SET activo = 0
                WHERE id_producto = ?
            `, [req.params.id]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Producto no encontrado.',
                    404
                );
            }

            res.json({
                message: 'Producto desactivado.'
            });
        })
    );

    /* ======================================
       PERFIL DEL USUARIO
    ====================================== */

    router.get(
        '/profile',
        requireLogin,
        current
    );

    router.put(
        '/profile',
        requireLogin,
        wrap(async (req, res) => {
            const {
                nombre,
                apellido_paterno,
                apellido_materno,
                foto_perfil
            } = req.body || {};

            if (
                !clean(nombre) ||
                !clean(apellido_paterno)
            ) {
                return errorResponse(
                    res,
                    'Nombre y apellido son obligatorios.'
                );
            }

            let foto = foto_perfil;

            if (
                typeof foto === 'string' &&
                foto.startsWith('data:image/')
            ) {
                foto = await saveImage(
                    foto,
                    'profiles'
                );
            } else if (foto === undefined) {
                foto = null;
            }

            await pool.query(`
                UPDATE usuarios
                SET
                    nombre = ?,
                    apellido_paterno = ?,
                    apellido_materno = ?,
                    foto_perfil =
                        COALESCE(
                            ?,
                            foto_perfil
                        )
                WHERE id_usuario = ?
            `, [
                clean(nombre),
                clean(apellido_paterno),
                clean(apellido_materno) || null,
                foto,
                req.s.user.id
            ]);

            req.s.user.name = clean(nombre);

            res.json({
                message: 'Perfil actualizado.'
            });
        })
    );

    /* ======================================
       CAMBIAR CONTRASEÑA
    ====================================== */

    router.put(
        '/change-password',
        requireLogin,
        wrap(async (req, res) => {
            const {
                actual,
                nueva
            } = req.body || {};

            if (
                String(nueva || '').length < 8
            ) {
                return errorResponse(
                    res,
                    'La nueva contraseña debe tener al menos 8 caracteres.'
                );
            }

            const [[user]] = await pool.query(`
                SELECT password_hash
                FROM usuarios
                WHERE id_usuario = ?
            `, [req.s.user.id]);

            if (
                !user ||
                !await bcrypt.compare(
                    String(actual || ''),
                    user.password_hash
                )
            ) {
                return errorResponse(
                    res,
                    'La contraseña actual no es correcta.'
                );
            }

            await pool.query(`
                UPDATE usuarios
                SET password_hash = ?
                WHERE id_usuario = ?
            `, [
                await bcrypt.hash(nueva, 10),
                req.s.user.id
            ]);

            res.json({
                message: 'Contraseña actualizada.'
            });
        })
    );

    /* ======================================
       REPORTES DE INVENTARIO
       SOLO ADMINISTRADOR
    ====================================== */

    router.get(
        '/reports',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const [rows] = await pool.query(`
                SELECT
                    i.id_incidencia AS id,
                    i.tipo_incidencia AS tipo,
                    i.prioridad,
                    i.estado,
                    i.descripcion,
                    i.cantidad_sistema AS cantidadSistema,
                    i.cantidad_contada AS cantidadContada,
                    i.fecha_reporte AS fecha,
                    u.nombre AS empleado,
                    p.nombre AS producto,
                    p.sku,
                    (
                        SELECT url_foto
                        FROM evidencias_incidencia e
                        WHERE e.id_incidencia =
                            i.id_incidencia
                        ORDER BY id_evidencia
                        LIMIT 1
                    ) AS foto
                FROM incidencias_inventario i
                JOIN usuarios u
                    ON u.id_usuario = i.id_usuario
                LEFT JOIN productos p
                    ON p.id_producto = i.id_producto
                ORDER BY i.fecha_reporte DESC
            `);

            res.json(rows);
        })
    );

    router.get(
        '/reports/:id',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const [[report]] = await pool.query(`
                SELECT
                    i.*,
                    u.nombre AS empleado,
                    u.correo,
                    p.nombre AS producto,
                    p.sku
                FROM incidencias_inventario i
                JOIN usuarios u
                    ON u.id_usuario = i.id_usuario
                LEFT JOIN productos p
                    ON p.id_producto = i.id_producto
                WHERE i.id_incidencia = ?
            `, [req.params.id]);

            if (!report) {
                return errorResponse(
                    res,
                    'Reporte no encontrado.',
                    404
                );
            }

            const [photos] = await pool.query(`
                SELECT
                    url_foto,
                    nombre_archivo,
                    descripcion
                FROM evidencias_incidencia
                WHERE id_incidencia = ?
            `, [req.params.id]);

            res.json({
                ...report,
                evidencias: photos
            });
        })
    );

    router.patch(
        '/reports/:id',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const {
                estado,
                solucion
            } = req.body || {};

            if (
                ![
                    'PENDIENTE',
                    'EN_REVISION',
                    'RESUELTA',
                    'RECHAZADA'
                ].includes(estado)
            ) {
                return errorResponse(
                    res,
                    'Estado inválido.'
                );
            }

            const [result] = await pool.query(`
                UPDATE incidencias_inventario
                SET
                    estado = ?,
                    solucion = ?,
                    id_admin_asignado = ?,
                    fecha_resolucion =
                        IF(
                            ? IN (
                                'RESUELTA',
                                'RECHAZADA'
                            ),
                            NOW(),
                            NULL
                        )
                WHERE id_incidencia = ?
            `, [
                estado,
                clean(solucion) || null,
                req.s.user.id,
                estado,
                req.params.id
            ]);

            if (!result.affectedRows) {
                return errorResponse(
                    res,
                    'Reporte no encontrado.',
                    404
                );
            }

            res.json({
                message: 'Reporte actualizado.'
            });
        })
    );

    /* ======================================
       DESCARGAR REPORTE PDF
       SOLO ADMINISTRADOR
    ====================================== */

/* ======================================
   DESCARGAR REPORTE PDF
   SOLO ADMINISTRADOR
====================================== */

/* ======================================
   PDF DE REPORTE CON FOTOGRAFIAS
   SOLO ADMINISTRADOR
====================================== */

router.get(
    '/reports/:id/pdf',
    requireLogin,
    requireAdmin,
    wrap(async (req, res) => {

        const id = Number(req.params.id);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                error: 'Folio inválido.'
            });
        }

        /* ==================================
           CONSULTAR REPORTE
        ================================== */

        const [[reporte]] = await pool.query(`
            SELECT
                i.*,
                u.nombre AS empleado,
                u.apellido_paterno AS apellido_empleado,
                u.correo AS correo_empleado,
                p.nombre AS producto,
                p.sku

            FROM incidencias_inventario i

            JOIN usuarios u
                ON u.id_usuario = i.id_usuario

            LEFT JOIN productos p
                ON p.id_producto = i.id_producto

            WHERE i.id_incidencia = ?
        `, [id]);

        if (!reporte) {
            return res.status(404).json({
                error: 'Reporte no encontrado.'
            });
        }

        /* ==================================
           CONSULTAR FOTOGRAFIAS
        ================================== */

        const [evidencias] = await pool.query(`
            SELECT url_foto

            FROM evidencias_incidencia

            WHERE id_incidencia = ?

            ORDER BY id_evidencia ASC
        `, [id]);

        /* ==================================
           CREAR DOCUMENTO
        ================================== */

        const doc = new PDFDocument({

            size: 'A4',

            margins: {
                top: 48,
                bottom: 48,
                left: 48,
                right: 48
            },

            info: {
                Title: `FerroMax - Reporte ${id}`,
                Author: 'FerroMax',
                Subject: 'Reporte de inventario'
            }

        });

        const partes = [];

        const listo = new Promise(
            (resolve, reject) => {

                doc.on('data', parte => {
                    partes.push(parte);
                });

                doc.once('end', () => {
                    resolve(
                        Buffer.concat(partes)
                    );
                });

                doc.once('error', reject);

            }
        );

        /* ==================================
           ENCABEZADO
        ================================== */

        doc.font('Helvetica-Bold')
            .fontSize(18)
            .fillColor('#C8102E')
            .text(
                'FERROMAX',
                { align: 'center' }
            );

        doc.font('Helvetica')
            .fontSize(11)
            .fillColor('#555555')
            .text(
                'REPORTE DE INVENTARIO',
                { align: 'center' }
            );

        doc.moveDown(1);

        doc.moveTo(48, doc.y)
            .lineTo(547, doc.y)
            .strokeColor('#C8102E')
            .stroke();

        doc.moveDown(1);

        /* ==================================
           DATOS DEL REPORTE
        ================================== */

        const valor = dato => {

            if (
                dato === null ||
                dato === undefined ||
                dato === ''
            ) {
                return 'N/D';
            }

            return String(dato);
        };

        const campo = (titulo, dato) => {

            doc.font('Helvetica-Bold')
                .fontSize(10)
                .fillColor('#252525')
                .text(
                    `${titulo}: `,
                    { continued: true }
                );

            doc.font('Helvetica')
                .fillColor('#333333')
                .text(valor(dato));

            doc.moveDown(0.35);

        };

        const fecha = reporte.fecha_reporte
            ? new Date(
                reporte.fecha_reporte
            ).toLocaleString('es-MX', {

                timeZone: 'America/Mexico_City',

                dateStyle: 'medium',

                timeStyle: 'short'

            })
            : 'N/D';

        const diferencia = (
            reporte.cantidad_sistema == null ||
            reporte.cantidad_contada == null
        )
            ? 'N/D'
            : String(
                Number(reporte.cantidad_contada) -
                Number(reporte.cantidad_sistema)
            );

        campo(
            'Folio',
            reporte.id_incidencia
        );

        campo(
            'Fecha',
            fecha
        );

        campo(
            'Empleado',
            [
                reporte.empleado,
                reporte.apellido_empleado
            ].filter(Boolean).join(' ')
        );

        campo(
            'Correo',
            reporte.correo_empleado
        );

        campo(
            'Producto',
            reporte.producto || 'No especificado'
        );

        campo(
            'SKU',
            reporte.sku || 'Sin SKU'
        );

        campo(
            'Tipo de incidencia',
            reporte.tipo_incidencia
        );

        campo(
            'Prioridad',
            reporte.prioridad
        );

        campo(
            'Estado',
            reporte.estado
        );

        campo(
            'Cantidad del sistema',
            reporte.cantidad_sistema
        );

        campo(
            'Cantidad contada',
            reporte.cantidad_contada
        );

        campo(
            'Diferencia',
            diferencia
        );

        campo(
            'Descripción',
            reporte.descripcion
        );

        campo(
            'Solución administrativa',
            reporte.solucion || 'Pendiente'
        );

        /* ==================================
           APARTADO DE EVIDENCIAS
        ================================== */

        doc.moveDown(0.6);

        doc.font('Helvetica-Bold')
            .fontSize(13)
            .fillColor('#C8102E')
            .text(
                `EVIDENCIAS FOTOGRÁFICAS (${evidencias.length})`
            );

        doc.moveDown(0.5);

        if (!evidencias.length) {

            doc.font('Helvetica')
                .fontSize(10)
                .fillColor('#555555')
                .text(
                    'Este reporte no tiene fotografías adjuntas.'
                );

        }

        /* ==================================
           UBICACION DE LAS FOTOGRAFIAS
        ================================== */


        /* ==================================
           INSERTAR IMAGENES EN EL PDF
        ================================== */

        for (
            let indice = 0;
            indice < evidencias.length;
            indice++
        ) {

            const foto = evidencias[indice];

            const url = String(
                foto.url_foto || ''
            ).trim();

            const tituloFoto =
                `Evidencia ${indice + 1}`;

            /*
               Solamente utilizar archivos
               guardados por FerroMax.
            */

            if (
                !/^\/uploads\/reports\/[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp)$/i.test(
                    url
                )
            ) {

                campo(
                    tituloFoto,
                    'Imagen no disponible.'
                );

                continue;
            }

            try {

                /* ==========================
                   LEER FOTOGRAFIA
                ========================== */

                const { bytes } = await leerImagen(url);

                if (
                    bytes.length > MAX_FOTO_BYTES
                ) {
                    throw new Error(
                        'La imagen supera el tamaño permitido.'
                    );
                }

                let imagen = bytes;

                /* ==========================
                   DETECTAR FORMATO
                ========================== */

                const metadata = await sharp(
                    bytes,
                    {
                        limitInputPixels: 30000000
                    }
                ).metadata();

                if (
                    ![
                        'jpeg',
                        'png',
                        'webp'
                    ].includes(metadata.format)
                ) {

                    throw new Error(
                        'Formato de imagen no compatible.'
                    );

                }

                /* ==========================
                   CONVERTIR WEBP A PNG
                ========================== */

                if (
                    metadata.format === 'webp'
                ) {

                    imagen = await sharp(
                        bytes,
                        {
                            limitInputPixels: 30000000
                        }
                    )
                        .png()
                        .toBuffer();

                }

                /* ==========================
                   CALCULAR TAMAÑO
                ========================== */

                const anchoMaximo =
                    doc.page.width - 96;

                const altoMaximo = 320;

                const factor = Math.min(

                    anchoMaximo / metadata.width,

                    altoMaximo / metadata.height,

                    1

                );

                const ancho = Math.max(
                    1,
                    metadata.width * factor
                );

                const alto = Math.max(
                    1,
                    metadata.height * factor
                );

                /* ==========================
                   CONTROL DE PAGINAS
                ========================== */

                if (
                    doc.y + alto + 45 >
                    doc.page.height - 48
                ) {

                    doc.addPage();

                }

                /* ==========================
                   TITULO DE EVIDENCIA
                ========================== */

                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .fillColor('#222222')
                    .text(tituloFoto);

                /* ==========================
                   COORDENADAS DE IMAGEN
                ========================== */

                const y = doc.y + 8;

                const x =
                    (doc.page.width - ancho) / 2;

                /* ==========================
                   DIBUJAR IMAGEN REAL
                ========================== */

                doc.image(
                    imagen,
                    x,
                    y,
                    {
                        width: ancho,
                        height: alto
                    }
                );

                /* ==========================
                   CONTINUAR DOCUMENTO
                ========================== */

                doc.y =
                    y + alto + 18;

            } catch (error) {

                console.error(
                    `No se pudo adjuntar la evidencia ${
                        indice + 1
                    } del reporte ${id}:`,
                    error.message
                );

                campo(
                    tituloFoto,
                    'Fotografía no disponible en el servidor.'
                );

            }

        }

        /* ==================================
           FINALIZAR PDF
        ================================== */

        doc.end();

        const pdf = await listo;

        /* ==================================
           DESCARGAR PDF
        ================================== */

        res.setHeader(
            'Content-Type',
            'application/pdf'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="FerroMax-reporte-${id}.pdf"`
        );

        res.setHeader(
            'Content-Length',
            String(pdf.length)
        );

        res.setHeader(
            'Cache-Control',
            'no-store'
        );

        res.setHeader(
            'X-Content-Type-Options',
            'nosniff'
        );

        return res.status(200).end(pdf);

    })
);
    /* ======================================
   INVENTARIO WEB
   CONSULTAR PRODUCTOS Y CREAR REPORTES
====================================== */

// CONSULTAR PRODUCTOS SIN PERMITIR MODIFICACIONES
router.get(
    '/inventory/products',
    requireLogin,
    requireInventario,
    wrap(async (req, res) => {

        const [rows] = await pool.query(`
            SELECT
                p.id_producto AS id,
                p.sku,
                p.nombre,
                p.unidad_venta AS unidad,
                p.activo,
                c.nombre AS categoria,

                COALESCE((
                    SELECT SUM(e.existencia_actual)
                    FROM existencias e
                    WHERE e.id_producto = p.id_producto
                ), 0) AS stock,

                (
                    SELECT i.url_imagen
                    FROM imagenes_producto i
                    WHERE i.id_producto = p.id_producto
                    ORDER BY
                        i.es_principal DESC,
                        i.orden_visual,
                        i.id_imagen
                    LIMIT 1
                ) AS imagen

            FROM productos p

            LEFT JOIN categorias c
                ON c.id_categoria = p.id_categoria

            ORDER BY p.nombre ASC
        `);

        res.json(rows);
    })
);


// CONSULTAR LOS REPORTES DEL EMPLEADO
router.get(
    '/inventory/my-reports',
    requireLogin,
    requireInventario,
    wrap(async (req, res) => {

        const [rows] = await pool.query(`
            SELECT
                i.id_incidencia AS id,
                i.tipo_incidencia AS tipo,
                i.prioridad,
                i.estado,
                i.cantidad_sistema AS cantidadSistema,
                i.cantidad_contada AS cantidadContada,
                i.descripcion,
                i.fecha_reporte AS fecha,
                p.nombre AS producto,
                p.sku

            FROM incidencias_inventario i

            LEFT JOIN productos p
                ON p.id_producto = i.id_producto

            WHERE i.id_usuario = ?

            ORDER BY
                i.fecha_reporte DESC,
                i.id_incidencia DESC

            LIMIT 150
        `, [req.s.user.id]);

        res.json(rows);
    })
);


// CREAR Y ENVIAR REPORTE AL ADMINISTRADOR
router.post(
    '/inventory/reports',
    requireLogin,
    requireInventario,
    wrap(async (req, res) => {

        if (req.s.user.rol !== 'INVENTARIO') {
            return res.status(403).json({
                error: 'Solo el personal de inventario puede enviar este formulario.'
            });
        }

        const body = req.body || {};

        const idProducto = Number(body.productoId);
        const tipo = clean(body.tipo).toUpperCase();
        const prioridad = clean(
            body.prioridad || 'MEDIA'
        ).toUpperCase();

        const descripcion = clean(body.descripcion);
        const foto = body.foto || null;

        const tipos = [
            'FALTANTE',
            'SOBRANTE',
            'PRODUCTO_DANADO',
            'ERROR_STOCK',
            'PRODUCTO_EQUIVOCADO',
            'OTRO'
        ];

        const prioridades = [
            'BAJA',
            'MEDIA',
            'ALTA',
            'CRITICA'
        ];

        if (
            !Number.isSafeInteger(idProducto) ||
            idProducto <= 0
        ) {
            return res.status(400).json({
                error: 'Selecciona un producto válido.'
            });
        }

        if (
            !tipos.includes(tipo) ||
            !prioridades.includes(prioridad)
        ) {
            return res.status(400).json({
                error: 'Tipo o prioridad inválidos.'
            });
        }

        if (!validProductStock(body.cantidadContada)) {
            return res.status(400).json({
                error: 'Introduce una cantidad contada válida.'
            });
        }

        if (
            descripcion.length < 10 ||
            descripcion.length > 2000
        ) {
            return res.status(400).json({
                error: 'La descripción debe contener entre 10 y 2000 caracteres.'
            });
        }

        if (foto !== null) {
            const match =
                typeof foto === 'string'
                    ? FOTO_RE.exec(foto)
                    : null;

            if (
                !match ||
                Buffer.byteLength(
                    match[2],
                    'base64'
                ) > MAX_FOTO_BYTES
            ) {
                return res.status(400).json({
                    error: 'La fotografía debe ser JPG, PNG o WEBP y pesar máximo 5 MB.'
                });
            }
        }

        // Consultar el stock real desde la base de datos.
        // No se confía en una cantidad enviada desde el navegador.
        const [[producto]] = await pool.query(`
            SELECT
                p.id_producto AS id,

                COALESCE((
                    SELECT SUM(e.existencia_actual)
                    FROM existencias e
                    WHERE e.id_producto = p.id_producto
                ), 0) AS stock

            FROM productos p
            WHERE p.id_producto = ?
        `, [idProducto]);

        if (!producto) {
            return res.status(404).json({
                error: 'El producto no existe.'
            });
        }

        const conexion = await pool.getConnection();

        let fotoGuardada = null;

        try {
            await conexion.beginTransaction();

            // Guardar incidencia usando la tabla existente.
            const [result] = await conexion.query(`
                INSERT INTO incidencias_inventario (
                    id_usuario,
                    id_producto,
                    tipo_incidencia,
                    cantidad_sistema,
                    cantidad_contada,
                    descripcion,
                    prioridad
                )

                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.s.user.id,
                idProducto,
                tipo,
                Number(producto.stock),
                Number(body.cantidadContada),
                descripcion,
                prioridad
            ]);

            // Guardar evidencia opcional.
            if (foto !== null) {

                fotoGuardada = await saveImage(
                    foto,
                    'reports'
                );

                await conexion.query(`
                    INSERT INTO evidencias_incidencia (
                        id_incidencia,
                        url_foto,
                        nombre_archivo,
                        tipo_archivo
                    )

                    VALUES (?, ?, ?, ?)
                `, [
                    result.insertId,
                    fotoGuardada,
                    path.basename(fotoGuardada),
                    'image'
                ]);
            }

            await conexion.commit();

            return res.status(201).json({
                id: result.insertId,
                estado: 'PENDIENTE',
                message: 'Reporte enviado al administrador.'
            });


} catch (error) {

    await conexion.rollback().catch(() => {});

    /* ======================================
       LIMPIAR EVIDENCIA SI FALLA EL REPORTE
       LOCAL / RAILWAY STORAGE BUCKET
    ====================================== */

    if (
        fotoGuardada &&
        /^\/uploads\/reports\/[a-zA-Z0-9_.-]+$/.test(
            fotoGuardada
        )
    ) {
        await cleanupUploadedFile(
            fotoGuardada,
            'reports'
        ).catch(errorLimpieza => {
            console.error(
                'No se pudo limpiar la evidencia:',
                errorLimpieza
            );
        });
    }

    throw error;

} finally {
    conexion.release();
}

    })
);

    /* ======================================
       LOGIN DE LA APP MÓVIL
    ====================================== */

        router.post(
        '/mobile/login',
        (req, res, next) => {
            if (req.body?.idToken === undefined) return next();
            return limitarAcceso(req, res, next);
        },
        wrap(async (req, res) => {
            const usaGoogle = req.body?.idToken !== undefined;

            if (usaGoogle && !googleClientIdPersonal) {
                return errorResponse(res, 'El acceso con Google no está configurado.', 503);
            }

            const identidad = usaGoogle
                ? await verificarGoogleMovil(req.body.idToken)
                : null;

            if (usaGoogle && !identidad) {
                return errorResponse(res, 'Token de Google inválido.', 401);
            }

            const email = identidad?.correo ?? clean(req.body?.email).toLowerCase();
            const password = String(req.body?.password || '');

            const [[user]] = await pool.query(`
                SELECT id_usuario AS id, nombre, correo, password_hash,
                       google_sub, rol, activo
                FROM usuarios
                WHERE correo = ?
            `, [email]);

            const autorizado = user?.activo &&
                ['INVENTARIO', 'ADMINISTRADOR'].includes(user.rol);

            if (identidad && autorizado && user.google_sub === null) {
                return errorResponse(
                    res,
                    'Vincula primero tu cuenta de Google desde el panel web.',
                    409
                );
            }

            const ok = autorizado && (identidad
                ? user.google_sub === identidad.sub
                : typeof user.password_hash === 'string' &&
                  user.password_hash.startsWith('$2') &&
                  await bcrypt.compare(password, user.password_hash));

            if (!ok) {
                if (identidad) {
                    return errorResponse(
                        res,
                        'Esta cuenta no está autorizada para la app móvil.',
                        403
                    );
                }

                return errorResponse(res, 'Credenciales de empleado incorrectas.', 401);
            }

            const secret = process.env.MOBILE_API_SECRET;

            if (!secret) {
                return errorResponse(res, 'Configura MOBILE_API_SECRET en .env', 503);
            }

            const token = sign({
                id: user.id,
                rol: user.rol,
                exp: Date.now() + 8 * 60 * 60 * 1000
            }, secret);
                        if (identidad) {
                req.iniciarSesionAdmin({
                    id: user.id,
                    name: user.nombre,
                    email: user.correo,
                    rol: user.rol,
                    googleSub: identidad.sub
                });
            }

            res.json({
                token,
                usuario: {
                    id: user.id,
                    nombre: user.nombre,
                    correo: user.correo,
                    rol: user.rol
                }
            });
        })
    );

    /* ======================================
       REPORTES DE LA APP MÓVIL
    ====================================== */

    router.post(
        '/mobile/reports',
        wrap(async (req, res) => {
            const token = String(
                req.headers.authorization || ''
            ).replace(
                /^Bearer\s+/i,
                ''
            );

            const who =
                process.env.MOBILE_API_SECRET
                    ? verify(
                        token,
                        process.env.MOBILE_API_SECRET
                    )
                    : null;

            if (
                !who ||
                ![
                    'INVENTARIO',
                    'ADMINISTRADOR'
                ].includes(who.rol)
            ) {
                return errorResponse(
                    res,
                    'Token de empleado inválido o vencido.',
                    401
                );
            }

            const {
                productoId,
                tipo,
                cantidadSistema,
                cantidadContada,
                descripcion,
                prioridad = 'MEDIA',
                foto
            } = req.body || {};

            const kinds = [
                'FALTANTE',
                'SOBRANTE',
                'PRODUCTO_DANADO',
                'ERROR_STOCK',
                'PRODUCTO_EQUIVOCADO',
                'OTRO'
            ];

            if (
                !kinds.includes(tipo) ||
                !clean(descripcion)
            ) {
                return errorResponse(
                    res,
                    'Tipo y descripción del reporte son obligatorios.'
                );
            }

            const [result] = await pool.query(`
                INSERT INTO incidencias_inventario (
                    id_usuario,
                    id_producto,
                    tipo_incidencia,
                    cantidad_sistema,
                    cantidad_contada,
                    descripcion,
                    prioridad
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                who.id,
                productoId
                    ? Number(productoId)
                    : null,
                tipo,
                cantidadSistema ?? null,
                cantidadContada ?? null,
                clean(descripcion),
                [
                    'BAJA',
                    'MEDIA',
                    'ALTA',
                    'CRITICA'
                ].includes(prioridad)
                    ? prioridad
                    : 'MEDIA'
            ]);

            if (
                typeof foto === 'string' &&
                foto.startsWith('data:image/')
            ) {
                const url = await saveImage(
                    foto,
                    'reports'
                );

                await pool.query(`
                    INSERT INTO evidencias_incidencia (
                        id_incidencia,
                        url_foto,
                        nombre_archivo,
                        tipo_archivo
                    )
                    VALUES (?, ?, ?, ?)
                `, [
                    result.insertId,
                    url,
                    path.basename(url),
                    'image'
                ]);
            }

            res.status(201).json({
                id: result.insertId,
                estado: 'PENDIENTE',
                message:
                    'Reporte recibido por FerreMax.'
            });
        })
    );

    /* ======================================
       PEDIDOS DE CLIENTES
       SOLO ADMINISTRADOR
    ====================================== */

    router.get(
        '/orders',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const [pedidos] = await pool.query(`
                SELECT
                    p.id_pedido AS id,
                    p.id_usuario AS clienteId,
                    p.fecha_pedido AS fecha,
                    p.estado,
                    p.metodo_pago AS metodoPago,
                    p.total,
                    u.nombre,
                    u.apellido_paterno,
                    u.apellido_materno,
                    u.correo,
                    COALESCE(
                        conteo.totalPedidos,
                        0
                    ) AS totalPedidosCliente
                FROM pedidos p
                LEFT JOIN usuarios u
                    ON u.id_usuario = p.id_usuario
                LEFT JOIN (
                    SELECT
                        id_usuario,
                        COUNT(*) AS totalPedidos
                    FROM pedidos
                    GROUP BY id_usuario
                ) conteo
                    ON conteo.id_usuario = p.id_usuario
                ORDER BY
                    p.fecha_pedido DESC,
                    p.id_pedido DESC
            `);

            res.json(pedidos);
        })
    );

    router.get(
        '/orders/:id',
        requireLogin,
        requireAdmin,
        wrap(async (req, res) => {
            const id = Number(req.params.id);

            if (!validId(id)) {
                return errorResponse(
                    res,
                    'Folio de pedido inválido.'
                );
            }

            const [[pedido]] = await pool.query(`
                SELECT
                    p.id_pedido AS id,
                    p.id_usuario AS clienteId,
                    p.fecha_pedido AS fecha,
                    p.estado,
                    p.metodo_pago AS metodoPago,
                    p.subtotal,
                    p.costo_envio AS costoEnvio,
                    p.total,
                    p.observaciones,
                    p.domicilio_calle AS calle,
                    p.domicilio_numero_exterior
                        AS numeroExterior,
                    p.domicilio_numero_interior
                        AS numeroInterior,
                    p.domicilio_colonia AS colonia,
                    p.domicilio_codigo_postal
                        AS codigoPostal,
                    p.domicilio_ciudad AS ciudad,
                    p.domicilio_estado AS entidad,
                    u.nombre,
                    u.apellido_paterno,
                    u.apellido_materno,
                    u.correo
                FROM pedidos p
                LEFT JOIN usuarios u
                    ON u.id_usuario = p.id_usuario
                WHERE p.id_pedido = ?
                LIMIT 1
            `, [id]);

            if (!pedido) {
                return errorResponse(
                    res,
                    'Pedido no encontrado.',
                    404
                );
            }

            const [productos] = await pool.query(`
                SELECT
                    d.id_producto AS productoId,
                    pr.sku,
                    pr.nombre,
                    d.cantidad,
                    d.precio_unitario AS precioUnitario,
                    d.subtotal
                FROM detalle_pedido d
                LEFT JOIN productos pr
                    ON pr.id_producto = d.id_producto
                WHERE d.id_pedido = ?
                ORDER BY d.id_producto
            `, [id]);

            const [[conteo]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM pedidos
                WHERE id_usuario = ?
            `, [pedido.clienteId]);

            res.json({
                pedido: {
                    ...pedido,
                    totalPedidosCliente: Number(
                        conteo.total || 0
                    )
                },
                productos
            });
        })
    );

    /* ======================================
       ERRORES DEL ROUTER ADMINISTRATIVO
    ====================================== */

    router.use((error, req, res, next) => {
        console.error('Admin API:', error);

        if (res.headersSent) {
            return next(error);
        }

        const status =
            error.status ||
            (
                error.code === 'ER_DUP_ENTRY'
                    ? 409
                    : 500
            );

        let message =
            error.code === 'ER_DUP_ENTRY'
                ? 'Ya existe un registro con esos datos.'
                : error.status
                    ? error.message
                    : 'Ocurrió un error al procesar la solicitud.';

        if (
            error.code === 'ER_NO_REFERENCED_ROW_2' ||
            error.code === 'ER_ROW_IS_REFERENCED_2'
        ) {
            message =
                'No se puede realizar la operación porque existen registros relacionados.';
        }

        res.status(
            error.code === 'ER_NO_REFERENCED_ROW_2' ||
            error.code === 'ER_ROW_IS_REFERENCED_2'
                ? 409
                : status
        ).json({
            error: message
        });
    });

    return router;
}
