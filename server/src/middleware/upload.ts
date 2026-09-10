import multer from 'multer';
import { httpError } from '#utils';

/** §8: 2 MB je Datei, nur PNG, JPEG und WebP. */
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * Die Datei bleibt im Speicher: sharp schreibt gleich danach die
 * normalisierte Fassung: eine Zwischendatei auf der Platte wäre nur Müll,
 * den jemand aufräumen müsste.
 */
export const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED.has(file.mimetype)) {
            callback(httpError(415, `${file.mimetype} ist nicht erlaubt`));
            return;
        }
        callback(null, true);
    },
}).single('file');
