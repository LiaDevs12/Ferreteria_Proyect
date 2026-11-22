import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { googleClientIdPersonal, verificarGooglePersonal } from './personal-google.js';

const DURACION = 5 * 60 * 1000;

export function registrarAccesoGoogle(router, { pool, roles, wrap }) {
    const intentosPorIp = new Map();
    let proximaLimpieza = 0;

    function limitarAcceso(req, res, next) {
        const ahora = Date.now();

        if (ahora >= proximaLimpieza) {
            for (const [ip, registro] of intentosPorIp) {
                if (registro.vence <= ahora) intentosPorIp.delete(ip);
            }
            proximaLimpieza = ahora + DURACION;
        }

        let registro = intentosPorIp.get(req.ip);
        if (!registro || registro.vence <= ahora) {
            registro = { intentos: 0, vence: ahora + DURACION };
            intentosPorIp.set(req.ip, registro);
        }

        registro.intentos += 1;
        if (registro.intentos > 30) {
            return res.status(429).json({
                error: 'Demasiados intentos. Espera unos minutos.'
            });
        }

        next();
    }

    async function buscarPersonal(correo) {
        const [[usuario]] = await pool.query(`
            SELECT id_usuario AS id, nombre, correo, rol, activo, google_sub, password_hash
            FROM usuarios
            WHERE correo = ?
        `, [correo]);

        return usuario?.activo && roles.includes(usuario.rol) ? usuario : null;
    }

    function vigente(req, estado) {
        return estado && req.s.accesoGooglePersonal === estado && estado.vence > Date.now();
    }

    function reintentar(res) {
        return res.status(401).json({ error: 'Reinicia el acceso con Google.' });
    }

    function iniciar(req, res, usuario, sub) {
        req.iniciarSesionAdmin({
            id: usuario.id,
            name: usuario.nombre,
            email: usuario.correo,
            rol: usuario.rol,
            googleSub: sub
        });

        res.json({ paso: 'autenticado' });
    }

    router.get('/auth/google/config', (req, res) => {
        if (!googleClientIdPersonal) return res.json({ googleClientId: '' });

        const nonce = randomBytes(32).toString('base64url');
        req.s.accesoGooglePersonal = {
            nonce,
            vence: Date.now() + DURACION
        };

        res.json({ googleClientId: googleClientIdPersonal, nonce });
    });

    router.post('/auth/google', limitarAcceso, wrap(async (req, res) => {
        const estado = req.s.accesoGooglePersonal;
        if (!vigente(req, estado) || !estado.nonce) return reintentar(res);

        const nonce = estado.nonce;
        delete estado.nonce;

        const identidad = await verificarGooglePersonal(req.body?.credential, nonce);
        if (!identidad || !vigente(req, estado)) return reintentar(res);

        const usuario = await buscarPersonal(identidad.correo);
        if (!vigente(req, estado)) return reintentar(res);

        if (!usuario || (usuario.google_sub !== null && usuario.google_sub !== identidad.sub)) {
            return res.status(403).json({
                error: 'Esta cuenta no está autorizada para el panel.'
            });
        }

        if (usuario.google_sub === identidad.sub) {
            return iniciar(req, res, usuario, identidad.sub);
        }

        estado.vinculo = { ...identidad, id: usuario.id, intentos: 0 };
        res.json({ paso: 'confirmar_contrasena' });
    }));

    router.post('/auth/google/vincular', limitarAcceso, wrap(async (req, res) => {
        const estado = req.s.accesoGooglePersonal;
        if (!vigente(req, estado) || !estado.vinculo) return reintentar(res);

        const vinculo = estado.vinculo;

        if (vinculo.ocupado) {
            return res.status(409).json({ error: 'Ya hay una validación en curso.' });
        }

        if (vinculo.intentos >= 5) {
            delete req.s.accesoGooglePersonal;
            return res.status(429).json({
                error: 'Demasiados intentos. Reinicia el acceso con Google.'
            });
        }

        vinculo.intentos += 1;
        vinculo.ocupado = true;

        try {
            const usuario = await buscarPersonal(vinculo.correo);
            const password = req.body?.password;

            if (
                usuario?.id !== vinculo.id ||
                usuario.google_sub !== null ||
                !usuario.password_hash?.startsWith('$2') ||
                typeof password !== 'string' ||
                !password ||
                !(await bcrypt.compare(password, usuario.password_hash))
            ) {
                return res.status(403).json({
                    error: 'La contraseña es incorrecta o la cuenta ya no admite la vinculación.'
                });
            }

            if (!vigente(req, estado)) return reintentar(res);

            const [resultado] = await pool.query(`
                UPDATE usuarios SET google_sub = ?
                WHERE id_usuario = ? AND correo = ? AND activo = 1 AND rol = ?
                  AND google_sub IS NULL AND BINARY password_hash = ?
            `, [vinculo.sub, usuario.id, usuario.correo, usuario.rol, usuario.password_hash]);

            if (resultado.affectedRows !== 1 || !vigente(req, estado)) {
                return reintentar(res);
            }

            iniciar(req, res, usuario, vinculo.sub);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    error: 'Esa cuenta de Google ya está vinculada.'
                });
            }
            throw error;
        } finally {
            vinculo.ocupado = false;
        }
    }));

    return limitarAcceso;
}