
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';

const requerido = nombre => {
    const valor = process.env[nombre];

    if (!valor) {
        throw new Error(`Falta configurar ${nombre}`);
    }

    return valor;
};

let clienteS3 = null;

function obtenerCliente() {
    if (!clienteS3) {
        clienteS3 = new S3Client({
            endpoint: requerido('AWS_ENDPOINT_URL'),
            region: requerido('AWS_DEFAULT_REGION'),
            forcePathStyle:
            process.env.AWS_S3_URL_STYLE === 'path',
            credentials: {
                accessKeyId: requerido('AWS_ACCESS_KEY_ID'),
                secretAccessKey: requerido('AWS_SECRET_ACCESS_KEY')
            }
        });
    }

    return clienteS3;
}

function claveDesdeUrl(url) {
    const match =
        /^\/uploads\/(products|brands|profiles|reports)\/([a-zA-Z0-9_.-]+)$/
            .exec(String(url || ''));

    if (
        !match ||
        match[2] === '.' ||
        match[2] === '..'
    ) {
        throw new Error('Ruta de imagen inválida.');
    }

    return `${match[1]}/${match[2]}`;
}

function nombreBucket() {
    return requerido('AWS_S3_BUCKET_NAME');
}

export async function subirImagen(url, bytes, tipo) {
    await obtenerCliente().send(
        new PutObjectCommand({
            Bucket: nombreBucket(),
            Key: claveDesdeUrl(url),
            Body: bytes,
            ContentType: tipo
        })
    );

    return url;
}

export async function obtenerImagen(url) {
    const respuesta = await obtenerCliente().send(
        new GetObjectCommand({
            Bucket: nombreBucket(),
            Key: claveDesdeUrl(url)
        })
    );

    const bytes =
        await respuesta.Body.transformToByteArray();

    return {
        bytes: Buffer.from(bytes),
        tipo: respuesta.ContentType ||
            'application/octet-stream'
    };
}

export async function eliminarImagen(url) {
    await obtenerCliente().send(
        new DeleteObjectCommand({
            Bucket: nombreBucket(),
            Key: claveDesdeUrl(url)
        })
    );
}
