/**
 * Deterministischer Pixel-Sprite aus einem Seed (PROJEKT.md §8).
 *
 * 5×5-Raster, an der Mittelachse gespiegelt — dadurch sind nur drei Spalten
 * frei und das Ergebnis sieht immer wie ein Gesicht aus, nie wie Rauschen.
 * Muster und Farbton fallen aus demselben Hash, ohne Abhängigkeit und ohne
 * Netzwerkaufruf. Wer ein Bild hochlädt, sieht das hier nie.
 */

/** djb2 — kurz, streut für kurze Namen gut genug, und immer gleich. */
const hash = (seed: string): number => {
    let value = 5381;
    for (let i = 0; i < seed.length; i++) {
        value = (value * 33) ^ seed.charCodeAt(i);
    }
    return value >>> 0;
};

export type PixelSprite = {
    /** 5 Zeilen à 5 Spalten, true = gesetzt. */
    cells: boolean[][];
    color: string;
};

export const pixelSprite = (seed: string): PixelSprite => {
    const value = hash(seed);

    const cells = Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, column) => {
            // Spalten 3 und 4 spiegeln 1 und 0.
            const source = column < 3 ? column : 4 - column;
            return ((value >> (row * 3 + source)) & 1) === 1;
        }),
    );

    // Die oberen Bits tragen den Farbton, damit er nicht mit dem Muster
    // korreliert. Sättigung und Helligkeit fest, sonst kippt der Kontrast.
    return { cells, color: `hsl(${(value >>> 24) * (360 / 256)} 90% 62%)` };
};
