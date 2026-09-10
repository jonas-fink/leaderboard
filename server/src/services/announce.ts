import { formatMetricValue } from '#utils';
import type {
    Announcement,
    AnnouncementPool,
    AnnouncementType,
    BoardState,
    PickVariant,
    SortOrder,
    StandingsEntry,
} from '#types';

/**
 * Reihenfolge = Dringlichkeit. Das Board zeigt zwei Toasts gleichzeitig und
 * stellt den Rest in die Warteschlange (PROJEKT.md §7) — was hinten steht,
 * sieht das Publikum unter Umständen erst Sekunden später.
 */
const PRIORITY: AnnouncementType[] = [
    'tournament_finished',
    'game_finished',
    'new_leader',
    'tie_broken',
    'overtake',
    'personal_best',
    'first_score',
];

/** Ein nicht belegter Platzhalter bleibt stehen, statt still zu verschwinden. */
const fill = (
    template: string,
    values: {
        entrant?: string;
        game?: string;
        value?: string;
        rank?: number;
    },
): string =>
    template.replace(/\{(entrant|game|value|rank)\}/g, (placeholder, key) => {
        const value = values[key as keyof typeof values];
        return value === undefined ? placeholder : String(value);
    });

const isBetter = (value: number, before: number, order: SortOrder): boolean =>
    order === 'ASC' ? value < before : value > before;

/**
 * Vergleicht zwei Board-Zustände und leitet daraus die Toast-Ereignisse ab.
 *
 * `previous` ist beim allerersten berechneten Zustand `undefined` — dann
 * kommt nichts zurück. Sonst bekäme ein Board, das mitten im Turnier
 * hochfährt, für jeden Teilnehmer einen Toast.
 *
 * `pick` zieht die Spruchvariante und ist injiziert: die Auswahl soll
 * zufällig und wiederholungsfrei sein, und beides ist Zustand über Aufrufe
 * hinweg, der in einem reinen Rule-Modul nichts verloren hat (KONVENTIONEN
 * §7.2). Der Text kommt fertig gerendert heraus, inklusive Wertformatierung
 * — auf derselben Leinwand darf nicht einmal `01:11.350` und einmal `71350`
 * stehen.
 */
export const announce = (
    previous: BoardState | undefined,
    next: BoardState,
    pool: AnnouncementPool,
    pick: PickVariant,
): Announcement[] => {
    if (!previous) return [];

    const events: Announcement[] = [];
    const push = (
        type: AnnouncementType,
        fields: Omit<Announcement, 'type' | 'text'>,
        values: Parameters<typeof fill>[1],
    ): void => {
        events.push({ ...fields, type, text: fill(pick(pool[type]), values) });
    };

    const before = new Map(previous.standings.map((s) => [s.entrantId, s]));
    const now = new Map(next.standings.map((s) => [s.entrantId, s]));
    const beforeGames = new Map(previous.games.map((g) => [g.game.id, g]));

    if (
        previous.tournament.status !== 'finished' &&
        next.tournament.status === 'finished'
    ) {
        push('tournament_finished', {}, {});
    }

    for (const boardGame of next.games) {
        const { id: gameId, title, primaryMetric } = boardGame.game;
        const wasGame = beforeGames.get(gameId);

        if (
            wasGame &&
            wasGame.status !== 'finished' &&
            boardGame.status === 'finished'
        ) {
            const winner = boardGame.entries.find((e) => e.rank === 1);
            push(
                'game_finished',
                { gameId, entrantId: winner?.entrantId },
                {
                    game: title,
                    entrant: now.get(winner?.entrantId ?? '')?.name,
                },
            );
        }

        // Eine Disziplin, die es vorher nicht gab, hat auch keine Vorwerte —
        // ihre Einträge sind damit alle Erstversuche.
        const wasEntries = new Map(
            (wasGame?.entries ?? []).map((e) => [e.entrantId, e]),
        );

        for (const entry of boardGame.entries) {
            const wasEntry = wasEntries.get(entry.entrantId);
            if (
                wasEntry &&
                !isBetter(entry.value, wasEntry.value, primaryMetric.sortOrder)
            ) {
                continue;
            }

            push(
                wasEntry ? 'personal_best' : 'first_score',
                {
                    entrantId: entry.entrantId,
                    gameId,
                    value: entry.value,
                    rank: entry.rank,
                },
                {
                    entrant: now.get(entry.entrantId)?.name,
                    game: title,
                    value: formatMetricValue(entry.value, primaryMetric),
                    rank: entry.rank,
                },
            );
        }
    }

    // Nur wer schon in der Wertung stand, kann die Führung übernehmen —
    // sonst meldet jeder neu angelegte Teilnehmer einen Führungswechsel.
    const wasLeader = new Set(
        previous.standings.filter((s) => s.rank === 1).map((s) => s.entrantId),
    );
    const newLeaders = next.standings.filter(
        (s) =>
            s.rank === 1 &&
            before.has(s.entrantId) &&
            !wasLeader.has(s.entrantId),
    );
    for (const leader of newLeaders) {
        push(
            'new_leader',
            { entrantId: leader.entrantId, rank: 1 },
            { entrant: leader.name, rank: 1 },
        );
    }

    const leaderIds = new Set(newLeaders.map((s) => s.entrantId));
    for (const standing of next.standings) {
        const was = before.get(standing.entrantId);
        if (!was || leaderIds.has(standing.entrantId)) continue;
        if (standing.rank < was.rank) {
            push(
                'overtake',
                { entrantId: standing.entrantId, rank: standing.rank },
                { entrant: standing.name, rank: standing.rank },
            );
        }
    }

    const groups = new Map<number, StandingsEntry[]>();
    for (const standing of previous.standings) {
        groups.set(standing.rank, [
            ...(groups.get(standing.rank) ?? []),
            standing,
        ]);
    }
    for (const group of groups.values()) {
        if (group.length < 2) continue;

        const after = group
            .map((s) => now.get(s.entrantId))
            .filter((s): s is StandingsEntry => s !== undefined);
        if (after.length < 2) continue;
        if (after.every((s) => s.rank === after[0]!.rank)) continue;

        const winner = after.reduce((best, s) =>
            s.rank < best.rank ? s : best,
        );
        push(
            'tie_broken',
            { entrantId: winner.entrantId, rank: winner.rank },
            { entrant: winner.name, rank: winner.rank },
        );
    }

    return events.sort(
        (a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type),
    );
};
