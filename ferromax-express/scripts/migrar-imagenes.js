
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';

const raiz = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../public/uploads'
);

const carpetas = [
    'products',
    'brands',
    'profiles',
    'reports'
];

const requerido = nombre => {
    const valor = process.env[nombre];
    if (!valor) throw new Error(`Falta ${nombre}`);
    return valor;
};

const bucket = requerido('AWS_S3_BUCKET_NAME');

const s3 = new S3Client({
    endpoint: requerido('AWS_ENDPOINT_URL'),
    region: requerido('AWS_DEFAULT_REGION'),
    forcePathStyle:
        process.env.AWS_S3_URL_STYLE === 'path',
    credentials: {
        accessKeyId: requerido('AWS_ACCESS_KEY_ID'),
        secretAccessKey: requerido('AWS_SECRET_ACCESS_KEY')
    }
});

const tipos = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
};

let subidas = 0;
let existentes = 0;
let errores = 0;

for (const carpeta of carpetas) {
    const directorio = path.join(raiz, carpeta);

    let archivos;

    try {
        archivos = await fs.readdir(directorio);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`Carpeta ausente: ${carpeta}`);
            continue;
        }
        throw error;
    }

    console.log(`\nProcesando ${carpeta}...`);

    for (const nombre of archivos) {
        const extension = path.extname(nombre).toLowerCase();

        if (!tipos[extension]) continue;

        const archivo = path.join(directorio, nombre);
        const key = `${carpeta}/${nombre}`;

        try {
            const info = await fs.stat(archivo);
            if (!info.isFile()) continue;

            let existente = null;

            try {
                existente = await s3.send(
                    new HeadObjectCommand({
                        Bucket: bucket,
                        Key: key
                    })
                );
            } catch (error) {
                if (
                    error.name !== 'NotFound' &&
                    error.name !== 'NoSuchKey' &&
                    error.$metadata?.httpStatusCode !== 404
                ) {
                    throw error;
                }
            }

            if (existente) {
                if (Number(existente.ContentLength) !== info.size) {
                    throw new Error(
                        'Ya existe un archivo con tamaño diferente'
                    );
                }

                existentes++;
                console.log(`Ya existe: ${key}`);
                continue;
            }

            const bytes = await fs.readFile(archivo);

            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: bytes,
                ContentType: tipos[extension]
            }));

            const verificacion = await s3.send(
                new HeadObjectCommand({
                    Bucket: bucket,
                    Key: key
                })
            );

            if (Number(verificacion.ContentLength) !== bytes.length) {
                throw new Error('El tamaño no coincide');
            }

            subidas++;
            console.log(`Subida correcta: ${key}`);

        } catch (error) {
            errores++;
            console.error(
                `Error en ${key}: ${error.message}`
            );
        }
    }
}

console.log('\n===== RESULTADO =====');
console.log('Archivos subidos:', subidas);
console.log('Ya existentes:', existentes);
console.log('Errores:', errores);
console.log('Total procesados:', subidas + existentes + errores);

if (errores > 0) {
    process.exitCode = 1;
}
