import { useState, type SubmitEvent } from 'react';
import { Modal } from '../Modal';
import { Field, FormError } from '../form';
import {
    ghostButtonClass,
    inputClass,
    parseTime,
    primaryButtonClass,
} from '../../lib/form';
import { usePlayers, useSubmitScore, useTeams } from '../../hooks';
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

    const teamMode = entrantType === 'team';
    const entrants = teamMode
        ? teams.map((t) => ({ id: t.id, name: t.name }))
        : players.map((p) => ({
              id: p.id,
              name: p.displayName || p.username,
          }));
    const isLoading = teamMode ? teamsLoading : playersLoading;

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
        submitScore.mutate(
            {
                tournamentId: game.tournamentId,
                gameId: game.id,
                entrantType,
                ...(teamMode
                    ? { teamId: entrantId }
                    : { playerId: entrantId }),
                primaryValue,
            },
            {
                onSuccess: () => {
                    setValue('');
                    onClose();
                },
            },
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
                <FormError error={submitScore.error} />

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
                        disabled={submitScore.isPending}
                        className={primaryButtonClass}
                    >
                        {submitScore.isPending ? 'Eintragen…' : 'Eintragen'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
