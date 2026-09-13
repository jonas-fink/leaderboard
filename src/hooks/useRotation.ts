import { useEffect, useState } from 'react';

/** §6: mehr Einträge als Plätze rotieren alle 20 Sekunden weiter. */
const ROTATE_MS = 20_000;
const TICK_MS = 1_000;
/** Takte je Seite — der Zähler zählt in Sekunden. */
const STEPS = ROTATE_MS / TICK_MS;

/**
 * Blättert eine Liste seitenweise weiter und sagt, wie lange die aktuelle
 * Seite noch steht.
 *
 * `hold` friert die Rotation ein: eine Karte, die gerade eine frische Wertung
 * bekommen hat, soll stehen bleiben, statt unter dem Toast wegzurutschen.
 * Der Zähler bleibt dann sichtbar stehen, wo er gerade war.
 *
 * Gezählt wird ein einziger, stetig wachsender Takt; Seite und Restzeit sind
 * daraus abgeleitet. Der Zustands-Updater bleibt dadurch frei von
 * Seiteneffekten — ein `setPage` **im** `setSecondsLeft`-Updater sah
 * funktionierend aus, wurde von React im Dev-Modus aber doppelt ausgeführt
 * und sprang deshalb zwei Seiten weiter. Bei genau zwei Seiten landete das
 * wieder auf der ersten, und die Rotation wirkte eingefroren.
 */
export const useRotation = <T>(items: T[], perPage: number, hold = false) => {
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    const [ticks, setTicks] = useState(0);

    useEffect(() => {
        if (pages === 1 || hold) return;

        const tick = setInterval(() => setTicks((t) => t + 1), TICK_MS);
        return () => clearInterval(tick);
    }, [pages, hold]);

    // Verschwindet ein Eintrag, zeigt `% pages` nie ins Leere.
    const page = Math.floor(ticks / STEPS) % pages;

    return {
        visible: items.slice(page * perPage, page * perPage + perPage),
        page,
        pages,
        secondsLeft: STEPS - (ticks % STEPS),
    };
};
