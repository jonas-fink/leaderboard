import { useState, type SubmitEvent } from 'react';
import { Modal } from '../Modal';
import { Field, FormError } from '../form';
import {
    ghostButtonClass,
    inputClass,
    primaryButtonClass,
} from '../../lib/form';
import { usePlayers, useTeams, useCreateMatch } from '../../hooks';
import type { Game, TournamentMode } from '../../schemas';

interface MatchFormModalProps {
    open: boolean;
    onClose: () => void;
    game: Game;
    /** Entscheidet über Spieler- oder Team-Selects — gilt fürs ganze Turnier,
     * nicht je Disziplin (PROJEKT.md §3), deshalb vom Aufrufer gereicht statt
     * hier neu ermittelt. */
    entrantType: TournamentMode;
}

/**
 * Ein Match-Ergebnis — zwei Seiten, je ein Wert. Vorbild `ScoreFormModal.tsx`,
 * mit zwei Selects statt einem und der Prüfung, dass beide Seiten
 * unterschiedliche Teilnehmer nennen (architecture.md 001-match-wertung).
 */
export const MatchFormModal = ({
    open,
    onClose,
    game,
    entrantType,
}: MatchFormModalProps) => {
    const [sideAId, setSideAId] = useState('');
    const [sideBId, setSideBId] = useState('');
    const [valueA, setValueA] = useState('');
    const [valueB, setValueB] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { data: players = [], isLoading: playersLoading } = usePlayers();
    const { data: teams = [], isLoading: teamsLoading } = useTeams(
        game.tournamentId,
    );
    const createMatch = useCreateMatch();

    const teamMode = entrantType === 'team';
    const entrants = teamMode
        ? teams.map((t) => ({ id: t.id, name: t.name }))
        : players.map((p) => ({
              id: p.id,
              name: p.displayName || p.username,
          }));
    const isLoading = teamMode ? teamsLoading : playersLoading;

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();

        if (!sideAId || !sideBId) {
            setError(
                teamMode
                    ? 'Bitte für beide Seiten ein Team wählen.'
                    : 'Bitte für beide Seiten wen wählen.',
            );
            return;
        }
        if (sideAId === sideBId) {
            setError('Die beiden Seiten müssen unterschiedliche Teilnehmer sein.');
            return;
        }

        const a = Number(valueA.replace(',', '.'));
        const b = Number(valueB.replace(',', '.'));
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            setError('Bitte für beide Seiten eine Zahl eingeben.');
            return;
        }
        if (a < 0 || b < 0) {
            setError('Der Wert darf nicht negativ sein.');
            return;
        }

        setError(null);
        const side = (id: string, value: number) =>
            teamMode ? { teamId: id, value } : { playerId: id, value };

        createMatch.mutate(
            {
                tournamentId: game.tournamentId,
                gameId: game.id,
                entrantType,
                sides: [side(sideAId, a), side(sideBId, b)],
            },
            {
                onSuccess: () => {
                    setSideAId('');
                    setSideBId('');
                    setValueA('');
                    setValueB('');
                    onClose();
                },
            },
        );
    };

    return (
        <Modal open={open} onClose={onClose} title={`Match — ${game.title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <Field label={teamMode ? 'Team A' : 'Spieler A'}>
                        <select
                            className={inputClass}
                            value={sideAId}
                            onChange={(e) => setSideAId(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="">
                                {isLoading ? 'lädt…' : 'wählen …'}
                            </option>
                            {entrants.map((entrant) => (
                                <option key={entrant.id} value={entrant.id}>
                                    {entrant.name}
                                </option>
                            ))}
                        </select>
                        <input
                            className={`${inputClass} mt-2 text-center font-display text-xl`}
                            value={valueA}
                            onChange={(e) => setValueA(e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                            autoFocus
                        />
                    </Field>

                    <div className="pb-2.5 font-display text-ink-mute">:</div>

                    <Field label={teamMode ? 'Team B' : 'Spieler B'}>
                        <select
                            className={inputClass}
                            value={sideBId}
                            onChange={(e) => setSideBId(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="">
                                {isLoading ? 'lädt…' : 'wählen …'}
                            </option>
                            {entrants.map((entrant) => (
                                <option key={entrant.id} value={entrant.id}>
                                    {entrant.name}
                                </option>
                            ))}
                        </select>
                        <input
                            className={`${inputClass} mt-2 text-center font-display text-xl`}
                            value={valueB}
                            onChange={(e) => setValueB(e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                        />
                    </Field>
                </div>

                <p className="text-xs text-ink-mute">
                    {game.primaryMetric.label} je Seite —{' '}
                    {teamMode
                        ? 'größer ist besser (Versus-Disziplinen sind DESC-only)'
                        : 'größer ist besser'}
                </p>

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
                <FormError error={createMatch.error} />

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
                        disabled={createMatch.isPending}
                        className={primaryButtonClass}
                    >
                        {createMatch.isPending ? 'Eintragen…' : 'Eintragen'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
