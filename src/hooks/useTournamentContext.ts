import { useTournaments } from './index';

/**
 * Das Turnier, auf das sich das Control-Panel bezieht.
 *
 * ponytail: kein Context-Provider und keine Auswahl im Speicher — es gibt
 * genau ein laufendes Event, und das ist das zuletzt gestartete. Ein Umschalter
 * kommt, wenn jemand zwei Turniere parallel bespielt; bis dahin wäre er ein
 * Bedienelement, das niemand anfasst.
 */
export const useTournamentContext = () => {
    const { data: tournaments = [], isLoading, error } = useTournaments();
    const live = tournaments.find((t) => t.status === 'live');

    return {
        tournament: live ?? tournaments[0],
        tournaments,
        isLoading,
        error,
    };
};
