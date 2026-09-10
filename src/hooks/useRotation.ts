import { useEffect, useState } from 'react';

/** §6: mehr gepinnte Disziplinen als Kartenplätze rotieren alle 20 Sekunden. */
const ROTATE_MS = 20_000;
const TICK_MS = 1_000;

/**
 * Blättert eine Liste seitenweise weiter und sagt, wie lange die aktuelle
 * Seite noch steht.
 *
 * `hold` friert die Rotation ein: eine Karte, die gerade eine frische Wertung
 * bekommen hat, soll stehen bleiben, statt unter dem Toast wegzurutschen.
 * Der Zähler läuft dabei weiter sichtbar bei 0 — das Publikum sieht, dass
 * gewartet wird, nicht dass etwas klemmt.
 */
export const useRotation = <T>(items: T[], perPage: number, hold = false) => {
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    const [page, setPage] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(ROTATE_MS / TICK_MS);

    useEffect(() => {
        if (pages === 1 || hold) return;

        const tick = setInterval(() => {
            setSecondsLeft((left) => {
                if (left > 1) return left - 1;
                setPage((current) => (current + 1) % pages);
                return ROTATE_MS / TICK_MS;
            });
        }, TICK_MS);
        return () => clearInterval(tick);
    }, [pages, hold]);

    // Verschwindet eine Disziplin, darf die Seite nicht ins Leere zeigen.
    const safePage = page % pages;

    return {
        visible: items.slice(safePage * perPage, safePage * perPage + perPage),
        page: safePage,
        pages,
        secondsLeft,
    };
};
