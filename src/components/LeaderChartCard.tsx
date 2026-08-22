import React from 'react';
import { type LeaderboardChartData, type LeaderboardEntry } from '../schemas';
import { formatMetricValue } from '../utils';

interface LeaderChartCardProps {
    data: LeaderboardChartData;
    onViewAll?: (gameSlug: string) => void;
    onSubmitScore?: (data: LeaderboardChartData) => void;
    /** Wie viele Ränge die Karte zeigt; auf der Detailseite alle. */
    limit?: number;
}

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderChartCardBase: React.FC<LeaderChartCardProps> = ({
    data,
    onViewAll,
    onSubmitScore,
    limit = 5,
}) => {
    const { game, topEntries, totalParticipants, timeframe } = data;

    const renderRow = (entry: LeaderboardEntry) => (
        <li
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-surface-2"
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-xs font-semibold text-ink-mute">
                    {medals[entry.rank] ?? `#${entry.rank}`}
                </span>

                {entry.player.avatarUrl ? (
                    <img
                        src={entry.player.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full border border-line object-cover"
                    />
                ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-bold uppercase text-ink-soft">
                        {entry.player.username.slice(0, 2)}
                    </div>
                )}

                <p className="truncate text-sm font-medium text-ink">
                    {entry.player.username}
                </p>
            </div>

            <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                {formatMetricValue(entry.primaryValue, game.primaryMetric)}
            </span>
        </li>
    );

    return (
        <article className="flex w-full md:max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="relative isolate flex h-32 flex-col justify-end p-4">
                {game.coverUrl ? (
                    <img
                        src={game.coverUrl}
                        alt=""
                        className="absolute inset-0 -z-10 h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 -z-10 bg-linear-to-br from-header-hextech via-runeterra-sapphire to-midnight-cobal" />
                )}
                <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/55 to-black/25" />

                <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                            {game.genre} • {timeframe.replace('_', ' ')}
                        </span>
                        <h3 className="truncate text-lg font-bold text-white">
                            {game.title}
                        </h3>
                    </div>
                    <span className="shrink-0 rounded-md border border-white/20 bg-white/15 px-2 py-1 text-xs text-white backdrop-blur-sm">
                        {totalParticipants} Spieler
                    </span>
                </div>
            </header>

            <div className="flex flex-1 flex-col p-4">
                <div className="mb-1.5 flex items-center justify-between px-2 text-xs font-medium text-ink-mute">
                    <span>Rang & Spieler</span>
                    <span>{game.primaryMetric.label}</span>
                </div>

                {topEntries.length === 0 ? (
                    <p className="flex-1 rounded-lg bg-surface-2 px-3 py-6 text-center text-sm text-ink-mute">
                        Noch keine Ergebnisse.
                    </p>
                ) : (
                    <ul className="flex-1 space-y-1">
                        {topEntries
                            .slice(0, limit)
                            .map((entry) => renderRow(entry))}
                    </ul>
                )}

                <div className="mt-4 flex gap-2">
                    {onSubmitScore && (
                        <button
                            onClick={() => onSubmitScore(data)}
                            className="flex-1 cursor-pointer rounded-lg bg-linear-to-br from-runeterra-sapphire to-midnight-cobal py-2 text-xs font-semibold text-logo transition-opacity hover:opacity-90"
                        >
                            Score eintragen
                        </button>
                    )}
                    {onViewAll && (
                        <button
                            onClick={() => onViewAll(game.slug)}
                            className="flex-1 cursor-pointer rounded-lg border border-line bg-surface-2 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-line hover:text-ink"
                        >
                            Vollständige Rangliste →
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

/**
 * memo, damit ein Score-Update nur die betroffene Karte neu rendert:
 * TanStack Query liefert bei unveränderten Daten dieselbe Objekt-Referenz
 * zurück, die anderen Karten fallen dadurch aus dem Re-Render heraus.
 */
export const LeaderChartCard = React.memo(LeaderChartCardBase);
