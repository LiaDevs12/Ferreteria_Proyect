import { OAuth2Client } from 'google-auth-library';

export const googleClientIdPersonal = process.env.GOOGLE_CLIENT_ID || '';

const clienteGoogle = googleClientIdPersonal
    ? new OAuth2Client(googleClientIdPersonal)
    : null;

export async function verificarGooglePersonal(credencial, nonce) {
    if (
        !clienteGoogle ||
        typeof nonce !== 'string' || !nonce ||
        typeof credencial !== 'string' || !credencial ||
        credencial.length > 8192
    ) return null;

    let datos;
    try {
        const ticket = await clienteGoogle.verifyIdToken({
            idToken: credencial,
            audience: googleClientIdPersonal
        });
        datos = ticket.getPayload();
    } catch {
        return null;
    }

    if (
        datos?.nonce !== nonce ||
        datos.email_verified !== true ||
        typeof datos.sub !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(datos.sub) ||
        typeof datos.email !== 'string' || datos.email.length > 150 ||
        !/^\S+@\S+\.\S+$/.test(datos.email)
    ) return null;

    return { sub: datos.sub, correo: datos.email.toLowerCase() };
}