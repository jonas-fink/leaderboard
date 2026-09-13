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
 *
 * Liegt unter `uploads/<userId>/` (AD-9, specs/002-benutzerkonten): macht die
 * Quote zu einem `readdir` ohne Zählerfeld und die Löschkaskade eines Kontos
 * zu einem einzigen Verzeichnis statt einer Dateisuche. Das Verzeichnis wird
 * bei Bedarf angelegt (E-11).
 */
export const storeImage = async (
    buffer: Buffer,
    userId: string,
): Promise<string> => {
    const normalized = await sharp(buffer)
        .resize(128, 128, { kernel: 'nearest', fit: 'cover' })
        .png()
        .toBuffer();

    const filename = `${randomUUID()}.png`;
    const dir = join(config.uploadDir, userId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), normalized);

    return `/uploads/${userId}/${filename}`;
};
