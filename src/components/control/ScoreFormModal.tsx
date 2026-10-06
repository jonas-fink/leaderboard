import { useState, type SubmitEvent } from 'react';
import { Modal } from '../Modal';
import { Field, FormError } from '../form';
import {
    ghostButtonClass,
    inputClass,
    parseTime,
    primaryButtonClass,
} from '../../lib/form';
import {
    usePlayers,
    useSubmitScore,
    useSubmitTeamScore,
    useTeams,
} from '../../hooks';
import type { Game, TournamentMode } from '../../schemas';

interface ScoreFormModalProps {
    open: boolean;
    onClose: () => void;
    game: Game;
    /** Entscheidet über Spieler- oder Team-Select — gilt fürs ganze Turnier,
     * nicht je Disziplin (PROJEKT.md §3), deshalb vom Aufrufer gereicht statt
     * hier neu ermittelt. Vorbild `MatchFormModal.tsx`. */
    entrantType: TournamentMode;
}

export const ScoreFormModal = ({
    open,
    onClose,
    game,
    entrantType,
}: ScoreFormModalProps) => {
    const [entrantId, setEntrantId] = useState('');
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { data: players = [], isLoading: playersLoading } = usePlayers();
    const { data: teams = [], isLoading: teamsLoading } = useTeams(
        game.tournamentId,
    );
    const submitScore = useSubmitScore();
    const submitTeamScore = useSubmitTeamScore();
    const pending = submitScore.isPending || submitTeamScore.isPending;

    // "Punkte pro Spieler" im Teamturnier: gewertet werden die Mitglieder.
    const perPlayer = entrantType === 'team' && game.teamScoring === 'players';
    const teamMode = entrantType === 'team' && !perPlayer;
    const scoredType = teamMode ? 'team' : 'player';
    const nameOf = (p: (typeof players)[number]) => p.displayName || p.username;
    const entrants = teamMode
        ? teams.map((t) => ({ id: t.id, name: t.name }))
        : perPlayer
          ? teams.flatMap((t) =>
                players
                    .filter((p) => t.members.includes(p.id))
                    .map((p) => ({
                        id: p.id,
                        name: `${nameOf(p)} (${t.name})`,
                    })),
            )
          : players.map((p) => ({ id: p.id, name: nameOf(p) }));
    const isLoading = teamsLoading || playersLoading;
    // Im Einzelmodus dienen Teams als Kader für Teamchallenges: ein Team zu
    // wählen trägt denselben Wert für jedes Mitglied ein.
    const rosters =
        entrantType === 'player'
            ? teams.filter((t) => t.members.length > 0)
            : [];
    const roster = rosters.find((t) => `team:${t.id}` === entrantId);

    const isTime = game.primaryMetric.formatter === 'time_ms';

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();

        if (!entrantId) {
            setError(
                teamMode
                    ? 'Bitte ein Team wählen.'
                    : 'Bitte einen Spieler wählen.',
            );
            return;
        }

        const primaryValue = isTime
            ? parseTime(value)
            : Number(value.replace(',', '.'));

        if (primaryValue === null || !Number.isFinite(primaryValue)) {
            setError(
                isTime
                    ? 'Zeit im Format mm:ss.mmm eingeben, z.B. 1:32.450'
                    : 'Bitte eine Zahl eingeben.',
            );
            return;
        }
        if (primaryValue < 0) {
            setError('Der Wert darf nicht negativ sein.');
            return;
        }

        setError(null);
        const done = {
            onSuccess: () => {
                setValue('');
                onClose();
            },
        };
        if (roster) {
            // Ein Request: der Server schreibt alle Mitglieder oder keins.
            submitTeamScore.mutate(
                {
                    tournamentId: game.tournamentId,
                    gameId: game.id,
                    teamId: roster.id,
                    primaryValue,
                },
                done,
            );
            return;
        }
        submitScore.mutate(
            {
                tournamentId: game.tournamentId,
                gameId: game.id,
                entrantType: scoredType,
                ...(teamMode ? { teamId: entrantId } : { playerId: entrantId }),
                primaryValue,
            },
            done,
        );
    };

    return (
        <Modal open={open} onClose={onClose} title={`Score — ${game.title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={teamMode ? 'Team' : 'Spieler'}>
                    <select
                        className={inputClass}
                        value={entrantId}
                        onChange={(e) => setEntrantId(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">
                            {isLoading
                                ? 'lädt…'
                                : teamMode
                                  ? 'Team wählen'
                                  : 'Spieler wählen'}
                        </option>
                        {entrants.map((entrant) => (
                            <option key={entrant.id} value={entrant.id}>
                                {entrant.name}
                            </option>
                        ))}
                        {rosters.length > 0 && (
                            <optgroup label="Ganzes Team (Teamchallenge)">
                                {rosters.map((team) => (
                                    <option
                                        key={team.id}
                                        value={`team:${team.id}`}
                                    >
                                        {team.name} ({team.members.length})
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </Field>

                <Field
                    label={game.primaryMetric.label}
                    hint={
                        isTime
                            ? 'Format mm:ss.mmm, z.B. 1:32.450'
                            : game.primaryMetric.unit
                    }
                >
                    <input
                        className={`${inputClass} font-mono`}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={isTime ? '1:32.450' : '12'}
                        inputMode={isTime ? 'text' : 'decimal'}
                        autoFocus
                    />
                </Field>

                {entrants.length === 0 && !isLoading && (
                    <p className=" border-2 border-line bg-surface-2 px-3 py-2 text-sm text-ink-soft">
                        {teamMode
                            ? 'Es gibt noch keine Teams — leg zuerst welche unter „Teams" an.'
                            : 'Es gibt noch keine Spieler — leg zuerst welche unter „Spieler" an.'}
                    </p>
                )}

                {error && (
                    <p className=" border-2 border-orange bg-orange/10 px-3 py-2 text-sm text-orange">
                        {error}
                    </p>
                )}
                <FormError error={submitScore.error ?? submitTeamScore.error} />

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className={ghostButtonClass}
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className={primaryButtonClass}
                    >
                        {pending ? 'Eintragen…' : 'Eintragen'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
