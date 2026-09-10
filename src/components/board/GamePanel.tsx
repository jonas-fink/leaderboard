import PixelSprite from './PixelSprite';
import { formatMetricValue } from '../../utils';
import type { BoardGame, BoardState } from '../../schemas';

interface GamePanelProps {
    game: BoardGame;
    /** Zum Nachschlagen von Name und Sprite — die Einträge tragen nur die ID. */
    standings: BoardState['standings'];
}

/** Statusfarben tragen Bedeutung: läuft = live, beendet = abgeschlossen. */
const STATUS = {
    upcoming: { label: 'GEPLANT', tone: 'border-line-strong text-ink-mute' },
    running: { label: 'LÄUFT', tone: 'border-cyan text-cyan' },
    finished: { label: 'BEENDET', tone: 'border-gold text-gold' },
} as const;

/** Eine Disziplin-Karte im 2×2-Raster (§6): die drei besten Plätze. */
const GamePanel = ({ game, standings }: GamePanelProps) => {
    const status = STATUS[game.status];
    const byId = new Map(standings.map((entry) => [entry.entrantId, entry]));
    const ascending = game.game.primaryMetric.sortOrder === 'ASC';

    return (
        <div className="flex flex-col border-2 border-line bg-surface/85 shadow-card">
            <div className="flex items-center justify-between gap-10 border-b-2 border-line px-16 py-12">
                <div className="min-w-0">
                    <div
                        className="truncate font-display tracking-[0.08em] text-ink"
                        style={{ fontSize: 'calc(var(--u) * 15)' }}
                    >
                        {game.game.title.toUpperCase()}
                    </div>
                    <div
                        className="mt-5 font-semibold uppercase tracking-[0.14em] text-ink-mute"
                        style={{ fontSize: 'calc(var(--u) * 13)' }}
                    >
                        {game.game.genre} · {game.game.primaryMetric.label}
                    </div>
                </div>
                <div
                    className={`shrink-0 border-2 px-10 py-5 font-display tracking-[0.12em] ${status.tone}`}
                    style={{ fontSize: 'calc(var(--u) * 11)' }}
                >
                    {status.label}
                </div>
            </div>

            <div className="flex grow flex-col justify-center gap-10 px-16 py-12">
                {game.entries.slice(0, 3).map((entry) => {
                    const who = byId.get(entry.entrantId);
                    return (
                        <div
                            key={entry.entrantId}
                            className="flex items-center gap-12"
                        >
                            <div
                                className={`w-24 text-center font-display ${entry.rank === 1 ? 'text-gold' : 'text-ink-mute'}`}
                                style={{ fontSize: 'calc(var(--u) * 17)' }}
                            >
                                {entry.rank}
                            </div>
                            <PixelSprite
                                imageUrl={who?.imageUrl}
                                seed={who?.avatarSeed ?? entry.entrantId}
                                size={32}
                                frame={
                                    entry.rank === 1
                                        ? 'border-gold'
                                        : 'border-line-strong'
                                }
                            />
                            <div
                                className="min-w-0 grow truncate font-semibold uppercase tracking-[0.04em] text-ink"
                                style={{ fontSize: 'calc(var(--u) * 17)' }}
                            >
                                {who?.name ?? '—'}
                            </div>
                            <div
                                className="shrink-0 font-display text-ink"
                                style={{ fontSize: 'calc(var(--u) * 17)' }}
                            >
                                {formatMetricValue(
                                    entry.value,
                                    game.game.primaryMetric,
                                )}
                            </div>
                        </div>
                    );
                })}

                {game.entries.length === 0 && (
                    <div
                        className="text-center font-semibold uppercase tracking-[0.14em] text-ink-mute"
                        style={{ fontSize: 'calc(var(--u) * 13)' }}
                    >
                        Noch keine Wertung
                    </div>
                )}
            </div>

            <div
                className="border-t-2 border-line px-16 py-10 font-semibold uppercase tracking-[0.14em] text-ink-mute"
                style={{ fontSize: 'calc(var(--u) * 13)' }}
            >
                {game.entries.length} gewertet ·{' '}
                {ascending ? 'kleiner ist besser' : 'größer ist besser'}
            </div>
        </div>
    );
};

export default GamePanel;
