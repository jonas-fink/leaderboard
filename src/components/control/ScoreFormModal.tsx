import { useState, type SubmitEvent } from 'react';
import { Modal } from '../Modal';
import { Field, FormError } from '../form';
import {
    ghostButtonClass,
    inputClass,
    parseTime,
    primaryButtonClass,
} from '../../lib/form';
import { usePlayers, useSubmitScore } from '../../hooks';
import type { Game } from '../../schemas';

interface ScoreFormModalProps {
    open: boolean;
    onClose: () => void;
    game: Game;
}

export const ScoreFormModal = ({
    open,
    onClose,
    game,
}: ScoreFormModalProps) => {
    const [playerId, setPlayerId] = useState('');
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { data: players = [], isLoading } = usePlayers();
    const submitScore = useSubmitScore();

    const isTime = game.primaryMetric.formatter === 'time_ms';

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();

        if (!playerId) {
            setError('Bitte einen Spieler wählen.');
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
                entrantType: 'player',
                playerId,
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
                <Field label="Spieler">
                    <select
                        className={inputClass}
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">
                            {isLoading ? 'lädt…' : 'Spieler wählen'}
                        </option>
                        {players.map((player) => (
                            <option key={player.id} value={player.id}>
                                {player.username}
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

                {players.length === 0 && !isLoading && (
                    <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-soft">
                        Es gibt noch keine Spieler — leg zuerst welche unter
                        „Spieler" an.
                    </p>
                )}

                {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
