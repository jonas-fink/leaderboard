import { useSyncExternalStore } from 'react';
import { useTournaments } from './index';

const KEY = 'control.tournamentId';
const listeners = new Set<() => void>();
// Ersatz, falls der Browser localStorage verweigert.
let selectedFallback: string | null = null;

const readSelected = () => {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** Wechselt das Turnier, auf das sich das ganze Control-Panel bezieht. */
export const selectTournament = (id: string) => {
    try {
        localStorage.setItem(KEY, id);
    } catch {
        // Privates Fenster o. ä.: die Wahl gilt dann nur bis zum Reload.
    }
    selectedFallback = id;
    listeners.forEach((listener) => listener());
};

/**
 * Das Turnier, auf das sich das Control-Panel bezieht: das zuletzt gewählte,
 * sonst das laufende, sonst das neueste.
 *
 * ponytail: die Wahl liegt je Browser im localStorage, nicht am Konto — ein
 * zweites Gerät startet wieder beim laufenden Turnier.
 */
export const useTournamentContext = () => {
    const { data: tournaments = [], isLoading, error } = useTournaments();
    const selectedId = useSyncExternalStore(
        subscribe,
        () => readSelected() ?? selectedFallback,
    );
    const selected = tournaments.find((t) => t.id === selectedId);
    const live = tournaments.find((t) => t.status === 'live');

    return {
        // Ein gelöschtes Turnier im Speicher fällt still auf die Regel zurück.
        tournament: selected ?? live ?? tournaments[0],
        tournaments,
        isLoading,
        error,
    };
};
