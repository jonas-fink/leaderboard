import { useState } from 'react';
import { Modal } from './Modal';
import { ghostButtonClass, primaryButtonClass } from '../lib/form';
import { usePlayerStats, useDeletePlayer } from '../hooks';
import { formatMetricValue } from '../utils';
import type { Player } from '../schemas';

interface PlayerDetailModalProps {
    player: Player | null;
    onClose: () => void;
    onEdit: (player: Player) => void;
}

const MEDALS = [
    { key: 'gold', icon: '🥇', label: 'Gold' },
    { key: 'silver', icon: '🥈', label: 'Silber' },
    { key: 'bronze', icon: '🥉', label: 'Bronze' },
] as const;

const dateFormat = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
});

export const PlayerDetailModal = ({
    player,
    onClose,
    onEdit,
}: PlayerDetailModalProps) => {
    const { data: stats, isLoading } = usePlayerStats(player?.id ?? null);
    const deletePlayer = useDeletePlayer();
    // Zweistufig statt confirm() — Löschen nimmt auch alle Scores mit.
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!player) return null;

    const handleDelete = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        deletePlayer.mutate(player.id, { onSuccess: onClose });
    };

    return (
        <Modal open onClose={onClose} title={player.username}>
            <div className="space-y-5">
                <div className="flex items-center gap-4">
                    {player.avatarUrl ? (
                        <img
                            src={player.avatarUrl}
                            alt=""
                            className="h-16 w-16 rounded-full border border-line object-cover"
                        />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-runeterra-sapphire to-midnight-cobal text-lg font-bold uppercase text-logo">
                            {player.username.slice(0, 2)}
                        </div>
                    )}
                    <div>
                        <p className="text-lg font-bold text-ink">
                            {player.username}
                        </p>
                        <p className="text-sm text-ink-mute">
                            {stats
                                ? `${stats.gamesPlayed} Games · ${stats.totalScores} Einträge`
                                : '…'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {MEDALS.map(({ key, icon, label }) => (
                        <div
                            key={key}
                            className="rounded-xl border border-line bg-surface-2 p-3 text-center"
                        >
                            <div className="text-2xl">{icon}</div>
                            <div className="text-xl font-bold text-ink">
                                {stats?.medals[key] ?? '–'}
                            </div>
                            <div className="text-[11px] uppercase tracking-wider text-ink-mute">
                                {label}
                            </div>
                        </div>
                    ))}
                </div>

                <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-mute">
                        Letzte Spiele
                    </h3>

                    {isLoading && (
                        <p className="text-sm text-ink-mute">Lädt…</p>
                    )}

                    {stats && stats.recentScores.length === 0 && (
                        <p className="text-sm text-ink-mute">
                            Noch keine Ergebnisse eingetragen.
                        </p>
                    )}

                    <ul className="space-y-1">
                        {stats?.recentScores.map((score) => (
                            <li
                                key={score.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-ink">
                                        {score.gameTitle ?? 'Unbekanntes Game'}
                                    </p>
                                    <p className="text-xs text-ink-mute">
                                        {dateFormat.format(
                                            new Date(score.recordedAt),
                                        )}
                                    </p>
                                </div>
                                <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                                    {score.primaryMetric
                                        ? formatMetricValue(
                                              score.primaryValue,
                                              score.primaryMetric,
                                          )
                                        : score.primaryValue}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <div className="flex justify-between gap-2 border-t border-line pt-4">
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deletePlayer.isPending}
                        className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                            confirmDelete
                                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                                : 'border-red-200 text-red-700 hover:bg-red-50'
                        }`}
                    >
                        {deletePlayer.isPending
                            ? 'Löschen…'
                            : confirmDelete
                              ? 'Wirklich löschen? Alle Scores gehen mit.'
                              : 'Löschen'}
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={ghostButtonClass}
                        >
                            Schließen
                        </button>
                        <button
                            type="button"
                            onClick={() => onEdit(player)}
                            className={primaryButtonClass}
                        >
                            Bearbeiten
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
