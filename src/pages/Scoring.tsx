import { useState } from 'react';
import { Field, MatchFormModal, ScoreFormModal } from '../components';
import { inputClass, labelClass, primaryButtonClass } from '../lib/form';
import {
    useDeleteMatch,
    useDeleteScore,
    useGames,
    useMatches,
    usePlayers,
    useScores,
    useTeams,
} from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';
import { formatMetricValue } from '../utils';
import type { MatchSide } from '../schemas';

/**
 * Relative Zeit über `Intl.RelativeTimeFormat` statt selbst gerechnet: das
 * beherrscht Plural und Vorzeichen. Beides ist hier nicht theoretisch — ein
 * Turnier lässt sich mit Startdatum in der Zukunft anlegen, und eine
 * handgestrickte Fassung schrieb dann "vor -1902316 Sekunden".
 */
const relative = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

const ago = (iso: string): string => {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const distance = Math.abs(seconds);

    if (distance < 60) return relative.format(seconds, 'second');
    if (distance < 3_600)
        return relative.format(Math.round(seconds / 60), 'minute');
    if (distance < 86_400)
        return relative.format(Math.round(seconds / 3_600), 'hour');
    return relative.format(Math.round(seconds / 86_400), 'day');
};

/**
 * Wertung eintragen und zurücknehmen — der Reiter, auf dem der Abend läuft.
 *
 * Ob Spieler oder Team gewählt wird, entscheidet der Modus des Turniers, nicht
 * die Disziplin: ein Turnier ist entweder das eine oder das andere (§3). Die
 * Disziplin selbst entscheidet aber, welches Formular sich öffnet (AC-2.6):
 * `ScoreFormModal` für metrische, `MatchFormModal` für Versus-Disziplinen
 * (architecture.md 001-match-wertung).
 */
const Scoring = () => {
    const { tournament } = useTournamentContext();
    // Games gehören zu genau einem Turnier (specs/002, BE-8) — der Server
    // liefert also schon nur die des aktuellen Turniers.
    const { data: games = [] } = useGames(tournament?.id);
    const { data: players = [] } = usePlayers();
    const { data: teams = [] } = useTeams(tournament?.id);
    const { data: scores = [] } = useScores(tournament?.id);

    const deleteScore = useDeleteScore(tournament?.id ?? '');

    const [gameId, setGameId] = useState('');
    const [formOpen, setFormOpen] = useState(false);

    // Ableitungen laufen unbedingt vor dem frühen Rückgabewert — sonst
    // würden useMatches/useDeleteMatch je nach Turnierzustand mal aufgerufen
    // und mal nicht (react-hooks/rules-of-hooks).
    const ownGames = games;
    const game = ownGames.find((g) => g.id === gameId) ?? ownGames[0];
    const isVersus = game?.scoring === 'versus';
    const teamMode = tournament?.mode === 'team';
    const entrants = teamMode
        ? teams.map((t) => ({ id: t.id, name: t.name }))
        : players.map((p) => ({
              id: p.id,
              name: p.displayName || p.username,
          }));

    const nameOfEntrant = (id: string | undefined) =>
        entrants.find((e) => e.id === id)?.name ?? 'Unbekannt';
    const nameOfSide = (side: MatchSide) =>
        nameOfEntrant(side.playerId ?? side.teamId);

    // Matches gibt es nur je Disziplin (architecture.md § API contract) —
    // ohne gefundene Versus-Disziplin bleibt der Hook untätig.
    const {
        data: matches = [],
        isLoading: matchesLoading,
        error: matchesError,
    } = useMatches(isVersus ? game?.id : undefined);
    const deleteMatch = useDeleteMatch(game?.id ?? '');

    if (!tournament) {
        return (
            <p className="border-2 border-line bg-surface p-6 text-ink-mute">
                Es gibt noch kein Turnier. Lege im Reiter TURNIER eines an.
            </p>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[640px_minmax(0,1fr)]">
            <section className="flex flex-col border-2 border-line bg-surface">
                <h2 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                    ERGEBNIS ERFASSEN
                </h2>

                <div className="flex flex-col gap-5 p-5">
                    <Field label="Disziplin">
                        <select
                            className={inputClass}
                            value={game?.id ?? ''}
                            onChange={(e) => setGameId(e.target.value)}
                        >
                            {ownGames.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.title} —{' '}
                                    {option.scoring === 'versus'
                                        ? 'Match'
                                        : option.primaryMetric.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    {!game && (
                        <p className="text-sm text-ink-mute">
                            Es gibt noch keine Disziplin. Lege im Reiter GAMES
                            eine an.
                        </p>
                    )}

                    {game && (
                        <>
                            <p className="text-sm text-ink-mute">
                                {isVersus
                                    ? '3 Punkte für den Sieg, 1 für das Unentschieden.'
                                    : `${game.primaryMetric.label} · ${
                                          game.primaryMetric.sortOrder ===
                                          'ASC'
                                              ? 'kleiner'
                                              : 'größer'
                                      } ist besser`}
                            </p>
                            <button
                                type="button"
                                className={primaryButtonClass}
                                onClick={() => setFormOpen(true)}
                            >
                                {isVersus
                                    ? 'MATCH ERFASSEN'
                                    : 'ERGEBNIS EINTRAGEN'}
                            </button>
                        </>
                    )}
                </div>
            </section>

            <section className="flex flex-col border-2 border-line bg-surface">
                <div className="flex items-center justify-between gap-3 border-b-2 border-line px-5 py-3.5">
                    <h2 className="font-display text-[15px] tracking-[0.12em] text-ink">
                        {isVersus ? 'ERFASSTE SPIELE' : 'LETZTE WERTUNGEN'}
                    </h2>
                    <span className={labelClass + ' mb-0'}>
                        {isVersus ? matches.length : scores.length} gezeigt
                    </span>
                </div>

                {isVersus ? (
                    <>
                        {matchesError && (
                            <p className="m-5 border-2 border-orange bg-orange/10 px-3 py-2 text-sm text-orange">
                                {matchesError.message}
                            </p>
                        )}

                        {matchesLoading && (
                            <ul className="divide-y divide-line">
                                {Array.from({ length: 3 }, (_, i) => (
                                    <li
                                        key={i}
                                        className="h-16 animate-pulse bg-surface-2"
                                    />
                                ))}
                            </ul>
                        )}

                        {!matchesLoading && !matchesError && (
                            <ul className="divide-y divide-line">
                                {matches.map((match) => (
                                    <li
                                        key={match.id}
                                        className="flex items-center gap-4 px-5 py-3"
                                    >
                                        <div className="min-w-0 grow">
                                            <div className="truncate text-[15px] font-semibold text-ink">
                                                {nameOfSide(match.sides[0])}{' '}
                                                <span className="font-display text-ink-mute">
                                                    {match.sides[0].value} :{' '}
                                                    {match.sides[1].value}
                                                </span>{' '}
                                                {nameOfSide(match.sides[1])}
                                            </div>
                                            <div className="text-xs uppercase tracking-[0.12em] text-ink-mute">
                                                {ago(match.playedAt)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label="Match zurücknehmen"
                                            title="Zurücknehmen"
                                            className="shrink-0 cursor-pointer border-2 border-line px-2 py-1 text-ink-mute transition-colors hover:border-orange hover:text-orange"
                                            onClick={() =>
                                                deleteMatch.mutate(match.id)
                                            }
                                        >
                                            ↺
                                        </button>
                                    </li>
                                ))}
                                {matches.length === 0 && (
                                    <li className="px-5 py-6 text-ink-mute">
                                        Noch kein Spiel erfasst.
                                    </li>
                                )}
                            </ul>
                        )}
                    </>
                ) : (
                    <ul className="divide-y divide-line">
                        {scores.map((score) => {
                            const scoreGame = games.find(
                                (g) => g.id === score.gameId,
                            );
                            return (
                                <li
                                    key={score.id}
                                    className="flex items-center gap-4 px-5 py-3"
                                >
                                    <div className="min-w-0 grow">
                                        <div className="truncate text-[15px] font-semibold text-ink">
                                            {nameOfEntrant(
                                                score.teamId ?? score.playerId,
                                            )}{' '}
                                            · {scoreGame?.title ?? 'Disziplin'}
                                        </div>
                                        <div className="text-xs uppercase tracking-[0.12em] text-ink-mute">
                                            {ago(score.recordedAt)}
                                        </div>
                                    </div>
                                    <div className="shrink-0 font-display text-ink">
                                        {scoreGame
                                            ? formatMetricValue(
                                                  score.primaryValue,
                                                  scoreGame.primaryMetric,
                                              )
                                            : score.primaryValue}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Wertung zurücknehmen"
                                        title="Zurücknehmen"
                                        className="shrink-0 cursor-pointer border-2 border-line px-2 py-1 text-ink-mute transition-colors hover:border-orange hover:text-orange"
                                        onClick={() =>
                                            deleteScore.mutate(score.id)
                                        }
                                    >
                                        ↺
                                    </button>
                                </li>
                            );
                        })}
                        {scores.length === 0 && (
                            <li className="px-5 py-6 text-ink-mute">
                                Noch nichts eingetragen.
                            </li>
                        )}
                    </ul>
                )}
            </section>

            {game && !isVersus && formOpen && (
                <ScoreFormModal
                    open
                    game={game}
                    entrantType={tournament.mode}
                    onClose={() => setFormOpen(false)}
                />
            )}
            {game && isVersus && formOpen && (
                <MatchFormModal
                    open
                    game={game}
                    entrantType={tournament.mode}
                    onClose={() => setFormOpen(false)}
                />
            )}
        </div>
    );
};

export default Scoring;
