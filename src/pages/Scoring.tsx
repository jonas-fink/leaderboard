import { useState, type SubmitEvent } from 'react';
import { Field, FormError } from '../components';
import {
    ghostButtonClass,
    inputClass,
    labelClass,
    parseTime,
    primaryButtonClass,
} from '../lib/form';
import {
    useDeleteScore,
    useGames,
    usePlayers,
    useScores,
    useSubmitScore,
    useTeams,
} from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';
import { formatMetricValue } from '../utils';

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
 * die Disziplin: ein Turnier ist entweder das eine oder das andere (§3).
 */
const Scoring = () => {
    const { tournament } = useTournamentContext();
    const { data: games = [] } = useGames();
    const { data: players = [] } = usePlayers();
    const { data: teams = [] } = useTeams(tournament?.id);
    const { data: scores = [] } = useScores(tournament?.id);

    const submitScore = useSubmitScore();
    const deleteScore = useDeleteScore(tournament?.id ?? '');

    const [gameId, setGameId] = useState('');
    const [entrantId, setEntrantId] = useState('');
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!tournament) {
        return (
            <p className="border-2 border-line bg-surface p-6 text-ink-mute">
                Es gibt noch kein Turnier. Lege im Reiter TURNIER eines an.
            </p>
        );
    }

    const ownGames = games.filter((g) => g.tournamentId === tournament.id);
    const game = ownGames.find((g) => g.id === gameId) ?? ownGames[0];
    const teamMode = tournament.mode === 'team';
    const entrants = teamMode
        ? teams.map((t) => ({ id: t.id, name: t.name }))
        : players.map((p) => ({
              id: p.id,
              name: p.displayName || p.username,
          }));
    const isTime = game?.primaryMetric.formatter === 'time_ms';

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        if (!game) return setError('Es gibt noch keine Disziplin.');
        if (!entrantId)
            return setError(
                teamMode ? 'Bitte ein Team wählen.' : 'Bitte wen wählen.',
            );

        const primaryValue = isTime
            ? parseTime(value)
            : Number(value.replace(',', '.'));
        if (primaryValue === null || !Number.isFinite(primaryValue)) {
            return setError(
                isTime
                    ? 'Zeit im Format mm:ss.mmm eingeben, z. B. 1:32.450'
                    : 'Bitte eine Zahl eingeben.',
            );
        }
        if (primaryValue < 0)
            return setError('Der Wert darf nicht negativ sein.');

        setError(null);
        submitScore.mutate(
            {
                tournamentId: tournament.id,
                gameId: game.id,
                entrantType: tournament.mode,
                ...(teamMode ? { teamId: entrantId } : { playerId: entrantId }),
                primaryValue,
            },
            { onSuccess: () => setValue('') },
        );
    };

    const nameOf = (score: (typeof scores)[number]) => {
        const id = score.teamId ?? score.playerId;
        return entrants.find((e) => e.id === id)?.name ?? 'Unbekannt';
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[640px_minmax(0,1fr)]">
            <section className="flex flex-col border-2 border-line bg-surface">
                <h2 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                    WERTUNG EINTRAGEN
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5 p-5"
                >
                    <Field label="Disziplin">
                        <select
                            className={inputClass}
                            value={game?.id ?? ''}
                            onChange={(e) => setGameId(e.target.value)}
                        >
                            {ownGames.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.title} —{' '}
                                    {option.primaryMetric.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label={teamMode ? 'Team' : 'Spieler'}>
                        <select
                            className={inputClass}
                            value={entrantId}
                            onChange={(e) => setEntrantId(e.target.value)}
                        >
                            <option value="">Bitte wählen …</option>
                            {entrants.map((entrant) => (
                                <option key={entrant.id} value={entrant.id}>
                                    {entrant.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        label={game?.primaryMetric.label ?? 'Wert'}
                        hint={
                            isTime
                                ? 'Format mm:ss.mmm'
                                : game &&
                                  `${game.primaryMetric.sortOrder === 'ASC' ? 'kleiner' : 'größer'} ist besser`
                        }
                    >
                        <input
                            className={`${inputClass} font-display text-xl`}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={isTime ? '01:58.412' : '0'}
                            inputMode={isTime ? 'text' : 'decimal'}
                        />
                    </Field>

                    {/* Kein Vorschau-Rang: der Server ist die einzige
                        Rechenquelle (KONVENTIONEN §8). Der Platz steht eine
                        Sekunde später in der Liste rechts. */}

                    <FormError
                        error={
                            error
                                ? new Error(error)
                                : (submitScore.error ?? null)
                        }
                    />

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className={primaryButtonClass}
                            disabled={submitScore.isPending}
                        >
                            {submitScore.isPending
                                ? 'Trage ein …'
                                : 'EINTRAGEN'}
                        </button>
                        <button
                            type="button"
                            className={ghostButtonClass}
                            onClick={() => {
                                setValue('');
                                setEntrantId('');
                                setError(null);
                            }}
                        >
                            LEEREN
                        </button>
                    </div>
                </form>
            </section>

            <section className="flex flex-col border-2 border-line bg-surface">
                <div className="flex items-center justify-between gap-3 border-b-2 border-line px-5 py-3.5">
                    <h2 className="font-display text-[15px] tracking-[0.12em] text-ink">
                        LETZTE WERTUNGEN
                    </h2>
                    <span className={labelClass + ' mb-0'}>
                        {scores.length} gezeigt
                    </span>
                </div>

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
                                        {nameOf(score)} ·{' '}
                                        {scoreGame?.title ?? 'Disziplin'}
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
                                    onClick={() => deleteScore.mutate(score.id)}
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
            </section>
        </div>
    );
};

export default Scoring;
