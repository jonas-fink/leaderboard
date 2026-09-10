import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { config } from '#config';

/**
 * Normalisiert ein hochgeladenes Bild auf 128×128 PNG (PROJEKT.md §8).
 *
 * `kernel: 'nearest'` ist der Grund für den ganzen Schritt: ein weich
 * skaliertes Logo verwäscht neben den Pixel-Sprites auf der Leinwand.
 * `fit: 'cover'` schneidet mittig zu, damit kein Bild verzerrt.
 *
 * Der Dateiname wird serverseitig neu vergeben — der hochgeladene ist
 * Nutzereingabe und hat auf der Platte nichts zu suchen.
 */
export const storeImage = async (buffer: Buffer): Promise<string> => {
    const normalized = await sharp(buffer)
        .resize(128, 128, { kernel: 'nearest', fit: 'cover' })
        .png()
        .toBuffer();

    const filename = `${randomUUID()}.png`;
    await mkdir(config.uploadDir, { recursive: true });
    await writeFile(join(config.uploadDir, filename), normalized);

    return `/uploads/${filename}`;
};
