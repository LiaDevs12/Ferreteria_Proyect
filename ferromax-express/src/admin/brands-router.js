
import express from 'express';
import crypto from 'node:crypto';

import {
    guardarImagen,
    borrarImagen
} from '../storage/imagenes.js';
const MAX = 5 * 1024 * 1024;

const DATA_URI =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/i;

const limpio = value => String(value ?? '').trim();

const validId = value =>
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;

function errorHttp(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

/* ==========================================
   GUARDAR LOGOTIPO
   LOCAL / RAILWAY STORAGE BUCKET
========================================== */

async function guardarLogo(data) {
    const match = DATA_URI.exec(String(data || ''));

    if (!match) {
        throw errorHttp(
            'El logotipo debe ser JPG, PNG o WEBP.'
        );
    }

    const bytes = Buffer.from(match[2], 'base64');

    if (!bytes.length || bytes.length > MAX) {
        throw errorHttp(
            'El logotipo debe pesar como máximo 5 MB.'
        );
    }

    const ext = match[1].toLowerCase() === 'jpeg'
        ? 'jpg'
        : match[1].toLowerCase();

    const filename =
        `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const url = `/uploads/brands/${filename}`;

    const mime = ext === 'jpg'
        ? 'image/jpeg'
        : `image/${ext}`;

    await guardarImagen(url, bytes, mime);

    return url;
}


/* ==========================================
   ELIMINAR LOGOTIPO ANTERIOR
   LOCAL / RAILWAY STORAGE BUCKET
========================================== */

async function eliminarLogo(url) {
    const match =
        /^\/uploads\/brands\/([a-zA-Z0-9_.-]+)$/.exec(
            String(url || '')
        );

    if (!match) {
        return;
    }

    await borrarImagen(url);
}
/* ==========================================
   VALIDAR MARCA Y CATEGORÍAS
========================================== */

function validar(body = {}) {
    const nombre = limpio(body.nombre);

    if (nombre.length < 2 || nombre.length > 100) {
        return {
            error: 'Nombre de marca: de 2 a 100 caracteres.'
        };
    }

    if (
        !Array.isArray(body.categorias) ||
        !body.categorias.length
    ) {
        return {
            error: 'Selecciona al menos una categoría para la marca.'
        };
    }

    if (!body.categorias.every(validId)) {
        return {
            error: 'Una o más categorías no son válidas.'
        };
    }

    const categorias = [
        ...new Set(body.categorias.map(Number))
    ];

    if (
        body.logo &&
        !DATA_URI.test(String(body.logo))
    ) {
        return {
            error: 'El logotipo debe ser una imagen JPG, PNG o WEBP.'
        };
    }

    if (
        body.quitarLogo === true &&
        body.logo
    ) {
        return {
            error: 'No puedes subir y quitar un logotipo a la vez.'
        };
    }

    return {
        nombre,
        categorias
    };
}

/* ==========================================
   COMPROBAR CATEGORÍAS EN MYSQL
========================================== */

async function comprobarCategorias(conn, categorias) {
    const [rows] = await conn.query(`
        SELECT id_categoria
        FROM categorias
        WHERE activo = 1
          AND id_categoria IN (?)
    `, [categorias]);

    if (rows.length !== categorias.length) {
        throw errorHttp(
            'Alguna categoría no existe o está desactivada.'
        );
    }
}

/* ==========================================
   GUARDAR RELACIONES CATEGORÍA - MARCA
========================================== */

async function asignarCategorias(
    conn,
    idMarca,
    categorias,
    reemplazar = false
) {
    if (reemplazar) {
        await conn.query(
            'DELETE FROM categoria_marca WHERE id_marca = ?',
            [idMarca]
        );
    }

    for (const idCategoria of categorias) {
        await conn.query(
            `INSERT INTO categoria_marca
             (id_categoria, id_marca)
             VALUES (?, ?)`,
            [idCategoria, idMarca]
        );
    }
}

/* ==========================================
   RUTAS ADMINISTRATIVAS DE MARCAS
========================================== */

export function createBrandsRouter({ pool }) {
    const router = express.Router();

    const wrap = fn => (req, res, next) =>
        Promise.resolve()
            .then(() => fn(req, res))
            .catch(next);

    /* SOLO ADMINISTRADORES */

    router.use((req, res, next) => {
        if (!req.s?.user) {
            return res.status(401).json({
                error: 'Inicia sesión.'
            });
        }

        if (req.s.user.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({
                error: 'Solo el administrador gestiona marcas.'
            });
        }

        next();
    });

    /* ======================================
       LISTAR MARCAS Y SUS CATEGORÍAS
    ====================================== */

    router.get('/', wrap(async (req, res) => {
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
            marcas.map(marca => ({
                ...marca,

                categorias: vinculos
                    .filter(v =>
                        Number(v.id_marca) ===
                        Number(marca.id)
                    )
                    .map(v =>
                        Number(v.id_categoria)
                    )
            }))
        );
    }));

    /* ======================================
       AGREGAR MARCA
    ====================================== */

    router.post('/', wrap(async (req, res) => {
        const data = validar(req.body);

        if (data.error) {
            return res.status(400).json({
                error: data.error
            });
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
                logo = await guardarLogo(
                    req.body.logo
                );
            }

            const [result] = await conn.query(`
                INSERT INTO marcas (
                    nombre,
                    logo_url,
                    activo
                )
                VALUES (?, ?, 1)
            `, [
                data.nombre,
                logo || null
            ]);

            await asignarCategorias(
                conn,
                result.insertId,
                data.categorias
            );

            await conn.commit();

            res.status(201).json({
                id: result.insertId,
                logo_url: logo,
                categorias: data.categorias,
                message: 'Marca registrada.'
            });

        } catch (error) {
            await conn.rollback();

            if (logo) {
                await eliminarLogo(logo);
            }

            throw error;

        } finally {
            conn.release();
        }
    }));

    /* ======================================
       ACTUALIZAR MARCA Y CATEGORÍAS
    ====================================== */

    router.put('/:id', wrap(async (req, res) => {
        if (!validId(req.params.id)) {
            return res.status(400).json({
                error: 'ID inválido.'
            });
        }

        const data = validar(req.body);

        if (data.error) {
            return res.status(400).json({
                error: data.error
            });
        }

        const conn = await pool.getConnection();

        let logoNuevo = '';
        let logoAnterior = '';

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

                return res.status(404).json({
                    error: 'Marca no encontrada.'
                });
            }

            await comprobarCategorias(
                conn,
                data.categorias
            );

            logoAnterior = actual.logo_url || '';

            if (req.body.logo) {
                logoNuevo = await guardarLogo(
                    req.body.logo
                );
            }

            const logoFinal =
                logoNuevo ||
                actual.logo_url ||
                null;

            const activo =
                typeof req.body.activo === 'boolean'
                    ? Number(req.body.activo)
                    : Number(actual.activo);

            await conn.query(`
                UPDATE marcas
                SET
                    nombre = ?,
                    logo_url = ?,
                    activo = ?
                WHERE id_marca = ?
            `, [
                data.nombre,
                logoFinal,
                activo,
                req.params.id
            ]);

            /* ACTUALIZAR LAS ASOCIACIONES */

            await asignarCategorias(
                conn,
                req.params.id,
                data.categorias,
                true
            );

            await conn.commit();

            if (
                logoNuevo &&
                logoAnterior &&
                logoAnterior !== logoFinal
            ) {
                await eliminarLogo(logoAnterior);
            }

            res.json({
                message: 'Marca actualizada.',
                logo_url: logoFinal,
                categorias: data.categorias
            });

        } catch (error) {
            await conn.rollback();

            if (logoNuevo) {
                await eliminarLogo(logoNuevo);
            }

            throw error;

        } finally {
            conn.release();
        }
    }));

    /* ======================================
       ACTIVAR O DESACTIVAR MARCA
    ====================================== */

    router.patch(
        '/:id/status',
        wrap(async (req, res) => {
            if (
                !validId(req.params.id) ||
                typeof req.body?.activo !== 'boolean'
            ) {
                return res.status(400).json({
                    error: 'ID o estado inválido.'
                });
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
                return res.status(404).json({
                    error: 'Marca no encontrada.'
                });
            }

            res.json({
                message: req.body.activo
                    ? 'Marca activada.'
                    : 'Marca desactivada.'
            });
        })
    );

    /* ======================================
       MANEJO DE ERRORES
    ====================================== */

    router.use((error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }

        console.error('Marcas:', error);

        const status =
            error.status ||
            (
                error.code === 'ER_DUP_ENTRY'
                    ? 409
                    : 500
            );

        const message =
            error.code === 'ER_DUP_ENTRY'
                ? 'Ya existe una marca con ese nombre.'
                : error.status
                    ? error.message
                    : 'No se pudo guardar la marca.';

        res.status(status).json({
            error: message
        });
    });

    return router;
}
