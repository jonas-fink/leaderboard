import React from 'react';
import { type LeaderboardChartData, type LeaderboardEntry } from '../schemas';
import { formatMetricValue } from '../utils';

interface LeaderChartCardProps {
    data: LeaderboardChartData;
    currentUserId?: string;
    onViewAll?: (gameSlug: string) => void;
}

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const LeaderChartCard: React.FC<LeaderChartCardProps> = ({
    data,
    currentUserId,
    onViewAll,
}) => {
    const { game, topEntries, totalParticipants, timeframe, userEntry } = data;

    const renderRow = (entry: LeaderboardEntry, isSelf = false) => (
        <li
            key={entry.id}
            className={`flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors ${
                isSelf
                    ? 'bg-accent-soft ring-1 ring-accent/25'
                    : 'hover:bg-surface-2'
            }`}
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
                    {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-accent">
                            (Du)
                        </span>
                    )}
                </p>
            </div>

            <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                {formatMetricValue(entry.primaryValue, game.primaryMetric)}
            </span>
        </li>
    );

    return (
        <article className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <header className="relative isolate flex h-32 flex-col justify-end p-4">
                {game.coverUrl ? (
                    <img
                        src={game.coverUrl}
                        alt=""
                        className="absolute inset-0 -z-10 h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 -z-10 bg-ink" />
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

                <ul className="flex-1 space-y-1">
                    {topEntries
                        .slice(0, 5)
                        .map((entry) =>
                            renderRow(entry, entry.player.id === currentUserId),
                        )}
                </ul>

                {userEntry && userEntry.rank > 5 && (
                    <div className="mt-3 border-t border-dashed border-line pt-2">
                        <p className="mb-1 px-1 text-[11px] text-ink-mute">
                            Deine Platzierung:
                        </p>
                        {renderRow(userEntry, true)}
                    </div>
                )}

                {onViewAll && (
                    <button
                        onClick={() => onViewAll(game.slug)}
                        className="mt-4 w-full rounded-lg border border-line bg-surface-2 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-line hover:text-ink"
                    >
                        Vollständige Rangliste ansehen →
                    </button>
                )}
            </div>
        </article>
    );
};
