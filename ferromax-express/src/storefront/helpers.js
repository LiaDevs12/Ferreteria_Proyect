export const clean = value =>
    String(value ?? '').trim();

export const emailOk = value =>
    /^\S+@\S+\.\S+$/.test(clean(value));
export const handle = fn => (req, res, next) =>
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
