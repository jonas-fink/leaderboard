import type { RequestHandler } from 'express';
import { httpError } from '#utils';
import { storeImage } from '#services/upload.service';
import type { UploadResult } from '#types';

/** Nimmt ein Bild entgegen und gibt die Adresse zurück, die ins Feld wandert. */
export const postUpload: RequestHandler = async (req, res) => {
    if (!req.file) throw httpError(400, 'Keine Datei im Feld "file"');
    res.status(201).json({
        url: await storeImage(req.file.buffer),
    } satisfies UploadResult);
};
