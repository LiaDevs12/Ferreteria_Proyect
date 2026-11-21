
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    subirImagen,
    obtenerImagen,
    eliminarImagen
} from './s3.js';

const raiz = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../public'
);

const usarS3 = () =>
    process.env.STORAGE_PROVIDER === 's3';

function rutaLocal(url) {
    const match =
        /^\/uploads\/(products|brands|profiles|reports)\/([a-zA-Z0-9_.-]+)$/
            .exec(String(url || ''));

    if (!match ||
        match[2] === '.' ||
        match[2] === '..') {
        throw new Error('Ruta de imagen inválida.');
    }

    return path.join(
        raiz,
        'uploads',
        match[1],
        match[2]
    );
}

export async function guardarImagen(url, bytes, tipo) {
    if (usarS3()) {
        return subirImagen(url, bytes, tipo);
    }

    const archivo = rutaLocal(url);

    await fs.mkdir(path.dirname(archivo), {
        recursive: true
    });

    await fs.writeFile(archivo, bytes, {
        flag: 'wx'
    });

    return url;
}

export async function leerImagen(url) {
    if (usarS3()) {
        return obtenerImagen(url);
    }

    const archivo = rutaLocal(url);
    const bytes = await fs.readFile(archivo);

    const ext = path.extname(archivo).toLowerCase();

    const tipos = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
    };

    return {
        bytes,
        tipo: tipos[ext] || 'application/octet-stream'
    };
}

export async function borrarImagen(url) {
    if (usarS3()) {
        return eliminarImagen(url);
    }

    await fs.unlink(rutaLocal(url)).catch(error => {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    });
}
