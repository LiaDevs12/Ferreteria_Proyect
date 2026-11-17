
/* ==========================================
   FERROMAX - SESIONES DE CLIENTES
========================================== */

export const sessions = new Map();

export function instalarSesiones(app) {

    app.use((req, res, next) => {

        const cookies = req.headers.cookie || '';

        const coincidencia =
            /(?:^|;\s*)sid=([a-f0-9]{32})(?=;|$)/
                .exec(cookies);

        const sid = coincidencia
            ? coincidencia[1]
            : null;

        const sesion = sid
            ? sessions.get(sid)
            : null;

        if (sesion) {

            req.sid = sid;
            req.s = sesion;

        } else {

            req.sid = null;

            req.s = {
                user: null
            };

        }

        next();

    });

}
