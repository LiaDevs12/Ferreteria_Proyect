
import express from 'express';

const limpiar = valor => String(valor ?? '').trim();

const idValido = valor =>
    Number.isSafeInteger(Number(valor)) &&
    Number(valor) > 0;

export function createSuppliersRouter({ pool }) {

    const router = express.Router();

    const wrap = fn => (req, res, next) =>
        Promise.resolve()
            .then(() => fn(req, res))
            .catch(next);

    /* ==========================================
       PERMISOS
    ========================================== */

    router.use((req, res, next) => {

        if (!req.s?.user) {
            return res.status(401).json({
                error: 'Debes iniciar sesión.'
            });
        }

        if (req.s.user.rol !== 'ADMINISTRADOR') {
            return res.status(403).json({
                error:
                    'Solo el administrador puede gestionar proveedores.'
            });
        }

        next();
    });

    /* ==========================================
       VALIDACIONES
    ========================================== */

    function validar(body = {}) {

        const datos = {
            nombre: limpiar(body.nombre),
            contacto: limpiar(body.contacto),
            telefono: limpiar(body.telefono),
            correo: limpiar(body.correo).toLowerCase(),
            direccion: limpiar(body.direccion),
            notas: limpiar(body.notas)
        };

        if (
            datos.nombre.length < 3 ||
            datos.nombre.length > 150
        ) {
            return {
                error:
                    'El nombre debe tener entre 3 y 150 caracteres.'
            };
        }

        if (
            datos.contacto.length > 150 ||
            datos.telefono.length > 20 ||
            datos.correo.length > 150 ||
            datos.direccion.length > 255 ||
            datos.notas.length > 4000
        ) {
            return {
                error:
                    'Revisa la longitud de los datos del proveedor.'
            };
        }

        if (
            datos.correo &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                datos.correo
            )
        ) {
            return {
                error:
                    'El correo electrónico no es válido.'
            };
        }

        if (
            !Array.isArray(body.productos) ||
            !body.productos.length ||
            body.productos.length > 1000 ||
            !body.productos.every(idValido)
        ) {
            return {
                error:
                    'Selecciona uno o varios productos válidos.'
            };
        }

        return {
            ...datos,
            productos: [
                ...new Set(body.productos.map(Number))
            ]
        };
    }

    /* ==========================================
       IMAGEN PRINCIPAL DEL PRODUCTO
    ========================================== */

    const imagenSQL = `
        (
            SELECT
                i.url_imagen

            FROM imagenes_producto i

            WHERE i.id_producto = p.id_producto

            ORDER BY
                i.es_principal DESC,
                i.orden_visual ASC,
                i.id_imagen ASC

            LIMIT 1
        ) AS imagen
    `;

    /* ==========================================
       CONSULTAR PROVEEDORES Y PRODUCTOS
    ========================================== */

    async function obtenerProveedores() {

        const [proveedores] = await pool.query(`
            SELECT
                id_proveedor AS id,
                nombre_empresa AS nombre,
                contacto,
                telefono,
                correo,
                direccion,
                notas,
                activo,
                fecha_creacion AS fechaCreacion

            FROM proveedores

            ORDER BY nombre_empresa
        `);

        const [relaciones] = await pool.query(`
            SELECT
                pp.id_proveedor AS proveedorId,

                p.id_producto AS id,
                p.sku,
                p.nombre,
                p.precio,
                p.activo,

                m.nombre AS marca,

                ${imagenSQL}

            FROM proveedor_productos pp

            INNER JOIN productos p
                ON p.id_producto = pp.id_producto

            LEFT JOIN marcas m
                ON m.id_marca = p.id_marca

            ORDER BY p.nombre
        `);

        const mapa = new Map(
            proveedores.map(p => [
                Number(p.id),
                []
            ])
        );

        for (const p of relaciones) {

            mapa.get(Number(p.proveedorId))?.push({
                id: Number(p.id),
                sku: p.sku,
                nombre: p.nombre,
                precio: Number(p.precio),
                activo: Boolean(p.activo),
                marca: p.marca || '',
                imagen: p.imagen || ''
            });
        }

        return proveedores.map(p => ({
            ...p,
            activo: Boolean(p.activo),
            productos:
                mapa.get(Number(p.id)) || []
        }));
    }

    /* ==========================================
       COMPROBAR PRODUCTOS
    ========================================== */

    async function comprobarProductos(conexion, ids) {

        const signos = ids
            .map(() => '?')
            .join(',');

        const [rows] = await conexion.query(
            `
                SELECT id_producto
                FROM productos
                WHERE id_producto IN (${signos})
            `,
            ids
        );

        return rows.length === ids.length;
    }

    /* ==========================================
       EVITAR PROVEEDORES DUPLICADOS
    ========================================== */

    async function nombreOcupado(
        conexion,
        nombre,
        omitirId = 0
    ) {

        const [[fila]] = await conexion.query(`
            SELECT id_proveedor

            FROM proveedores

            WHERE nombre_empresa = ?
              AND id_proveedor <> ?

            LIMIT 1
        `, [
            nombre,
            omitirId
        ]);

        return Boolean(fila);
    }

    /* ==========================================
       PRODUCTOS DISPONIBLES
       AHORA INCLUYEN FOTOGRAFÍAS
    ========================================== */

    router.get(
        '/products',
        wrap(async (_req, res) => {

            const [rows] = await pool.query(`
                SELECT
                    p.id_producto AS id,
                    p.sku,
                    p.nombre,
                    p.activo,

                    m.nombre AS marca,
                    c.nombre AS categoria,

                    ${imagenSQL}

                FROM productos p

                LEFT JOIN marcas m
                    ON m.id_marca = p.id_marca

                LEFT JOIN categorias c
                    ON c.id_categoria = p.id_categoria

                ORDER BY p.nombre
            `);

            res.json(
                rows.map(p => ({
                    ...p,
                    id: Number(p.id),
                    activo: Boolean(p.activo),
                    imagen: p.imagen || ''
                }))
            );
        })
    );

    /* ==========================================
       LISTAR PROVEEDORES
    ========================================== */

    router.get(
        '/',
        wrap(async (_req, res) => {

            res.json(
                await obtenerProveedores()
            );

        })
    );

    /* ==========================================
       CONSULTAR UN PROVEEDOR
    ========================================== */

    router.get(
        '/:id',
        wrap(async (req, res) => {

            if (!idValido(req.params.id)) {
                return res.status(400).json({
                    error: 'ID inválido.'
                });
            }

            const proveedor = (
                await obtenerProveedores()
            ).find(p =>
                Number(p.id) === Number(req.params.id)
            );

            if (!proveedor) {
                return res.status(404).json({
                    error: 'Proveedor no encontrado.'
                });
            }

            res.json(proveedor);
        })
    );

    /* ==========================================
       REGISTRAR PROVEEDOR
    ========================================== */

    router.post(
        '/',
        wrap(async (req, res) => {

            const datos = validar(req.body);

            if (datos.error) {
                return res.status(400).json({
                    error: datos.error
                });
            }

            const conexion =
                await pool.getConnection();

            try {

                await conexion.beginTransaction();

                if (
                    await nombreOcupado(
                        conexion,
                        datos.nombre
                    )
                ) {

                    await conexion.rollback();

                    return res.status(409).json({
                        error:
                            'Ya existe un proveedor con ese nombre.'
                    });
                }

                if (
                    !await comprobarProductos(
                        conexion,
                        datos.productos
                    )
                ) {

                    await conexion.rollback();

                    return res.status(400).json({
                        error:
                            'Uno o más productos no existen.'
                    });
                }

                const [resultado] =
                    await conexion.query(`
                        INSERT INTO proveedores (
                            nombre_empresa,
                            contacto,
                            telefono,
                            correo,
                            direccion,
                            notas,
                            activo
                        )
                        VALUES (?, ?, ?, ?, ?, ?, 1)
                    `, [
                        datos.nombre,
                        datos.contacto || null,
                        datos.telefono || null,
                        datos.correo || null,
                        datos.direccion || null,
                        datos.notas || null
                    ]);

                for (const productoId of datos.productos) {

                    await conexion.query(`
                        INSERT INTO proveedor_productos (
                            id_proveedor,
                            id_producto
                        )
                        VALUES (?, ?)
                    `, [
                        resultado.insertId,
                        productoId
                    ]);
                }

                await conexion.commit();

                res.status(201).json({
                    id: resultado.insertId,
                    message: 'Proveedor registrado.'
                });

            } catch (error) {

                await conexion.rollback();

                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        error:
                            'Ya existe un proveedor con ese nombre.'
                    });
                }

                throw error;

            } finally {

                conexion.release();
            }
        })
    );

    /* ==========================================
       ACTUALIZAR PROVEEDOR
    ========================================== */

    router.put(
        '/:id',
        wrap(async (req, res) => {

            if (!idValido(req.params.id)) {
                return res.status(400).json({
                    error: 'ID inválido.'
                });
            }

            const datos = validar(req.body);

            if (datos.error) {
                return res.status(400).json({
                    error: datos.error
                });
            }

            const id = Number(req.params.id);

            const conexion =
                await pool.getConnection();

            try {

                await conexion.beginTransaction();

                const [[existe]] =
                    await conexion.query(`
                        SELECT id_proveedor

                        FROM proveedores

                        WHERE id_proveedor = ?

                        FOR UPDATE
                    `, [id]);

                if (!existe) {

                    await conexion.rollback();

                    return res.status(404).json({
                        error:
                            'Proveedor no encontrado.'
                    });
                }

                if (
                    await nombreOcupado(
                        conexion,
                        datos.nombre,
                        id
                    )
                ) {

                    await conexion.rollback();

                    return res.status(409).json({
                        error:
                            'Ya existe otro proveedor con ese nombre.'
                    });
                }

                if (
                    !await comprobarProductos(
                        conexion,
                        datos.productos
                    )
                ) {

                    await conexion.rollback();

                    return res.status(400).json({
                        error:
                            'Uno o más productos no existen.'
                    });
                }

                await conexion.query(`
                    UPDATE proveedores

                    SET
                        nombre_empresa = ?,
                        contacto = ?,
                        telefono = ?,
                        correo = ?,
                        direccion = ?,
                        notas = ?

                    WHERE id_proveedor = ?
                `, [
                    datos.nombre,
                    datos.contacto || null,
                    datos.telefono || null,
                    datos.correo || null,
                    datos.direccion || null,
                    datos.notas || null,
                    id
                ]);

                await conexion.query(`
                    DELETE FROM proveedor_productos

                    WHERE id_proveedor = ?
                `, [id]);

                for (const productoId of datos.productos) {

                    await conexion.query(`
                        INSERT INTO proveedor_productos (
                            id_proveedor,
                            id_producto
                        )
                        VALUES (?, ?)
                    `, [
                        id,
                        productoId
                    ]);
                }

                await conexion.commit();

                res.json({
                    message:
                        'Proveedor y productos actualizados.'
                });

            } catch (error) {

                await conexion.rollback();

                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        error:
                            'Ya existe otro proveedor con ese nombre.'
                    });
                }

                throw error;

            } finally {

                conexion.release();
            }
        })
    );

    /* ==========================================
       ACTIVAR O DESACTIVAR PROVEEDOR
    ========================================== */

    router.patch(
        '/:id/status',
        wrap(async (req, res) => {

            if (
                !idValido(req.params.id) ||
                typeof req.body?.activo !== 'boolean'
            ) {
                return res.status(400).json({
                    error: 'Datos inválidos.'
                });
            }

            const [resultado] = await pool.query(`
                UPDATE proveedores

                SET activo = ?

                WHERE id_proveedor = ?
            `, [
                req.body.activo ? 1 : 0,
                Number(req.params.id)
            ]);

            if (!resultado.affectedRows) {
                return res.status(404).json({
                    error:
                        'Proveedor no encontrado.'
                });
            }

            res.json({
                message: req.body.activo
                    ? 'Proveedor activado.'
                    : 'Proveedor desactivado.'
            });
        })
    );

    return router;
}
