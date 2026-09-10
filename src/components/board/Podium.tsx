import PixelSprite from './PixelSprite';
import type { BoardState } from '../../schemas';

interface PodiumProps {
    standings: BoardState['standings'];
    /** In wie vielen Disziplinen der Teilnehmer angetreten ist, je entrantId. */
    played: Map<string, number>;
    gameCount: number;
}

const points = (value: number) => value.toFixed(1).replace('.', ',');

/** Wie viele Disziplinsiege — Index 0 der rankCounts ist die Zahl der Ersten. */
const wins = (entry: BoardState['standings'][number]) =>
    entry.rankCounts[0] ?? 0;

const winLabel = (count: number) =>
    `${count} Disziplinsieg${count === 1 ? '' : 'e'}`;

/**
 * Die ersten drei der Gesamtwertung (PROJEKT.md §2). Platz 1 bekommt die
 * ganze Bühne, Zwei und Drei je eine Zeile — auf zehn Meter soll ohne Lesen
 * klar sein, wer gewonnen hat.
 */
const Podium = ({ standings, played, gameCount }: PodiumProps) => {
    const [first, second, third] = standings;

    return (
        <div className="flex h-660 w-600 flex-col gap-16">
            {first && (
                <div className="flex h-320 items-center gap-24 border-2 border-gold bg-linear-120 from-gold/20 to-surface/90 px-26 shadow-[8px_8px_0_rgb(0_0_0/0.5),0_0_44px_rgb(255_210_63/0.32)]">
                    <PixelSprite
                        imageUrl={first.imageUrl}
                        seed={first.avatarSeed}
                        size={132}
                        frame="border-magenta"
                    />
                    <div className="flex min-w-0 flex-col gap-14">
                        <div
                            className="font-display tracking-[0.24em] text-gold"
                            style={{ fontSize: 'calc(var(--u) * 15)' }}
                        >
                            GESAMTSIEGER
                        </div>
                        <div
                            className="font-bold uppercase leading-[1.05] tracking-[0.03em] text-ink"
                            style={{ fontSize: 'calc(var(--u) * 40)' }}
                        >
                            {first.name}
                        </div>
                        <div className="flex items-baseline gap-12">
                            <div
                                className="font-display text-gold"
                                style={{ fontSize: 'calc(var(--u) * 44)' }}
                            >
                                {points(first.points)}
                            </div>
                            <div
                                className="font-semibold uppercase tracking-[0.14em] text-ink-soft"
                                style={{ fontSize: 'calc(var(--u) * 16)' }}
                            >
                                Punkte
                            </div>
                        </div>
                        <div
                            className="font-semibold uppercase tracking-[0.1em] text-ink-soft"
                            style={{ fontSize: 'calc(var(--u) * 16)' }}
                        >
                            {winLabel(wins(first))} · in{' '}
                            {played.get(first.entrantId) ?? 0} von {gameCount}{' '}
                            angetreten
                        </div>
                    </div>
                </div>
            )}

            {[second, third].map((entry, index) =>
                entry ? (
                    <div
                        key={entry.entrantId}
                        className="flex h-150 items-center gap-20 border-2 border-line bg-surface-2/70 px-22"
                    >
                        <div
                            className={`w-44 text-center font-display ${index === 0 ? 'text-ink-soft' : 'text-ink-mute'}`}
                            style={{ fontSize: 'calc(var(--u) * 40)' }}
                        >
                            {entry.rank}
                        </div>
                        <PixelSprite
                            imageUrl={entry.imageUrl}
                            seed={entry.avatarSeed}
                            size={76}
                            frame={index === 0 ? 'border-cyan' : 'border-gold'}
                        />
                        <div className="flex min-w-0 grow flex-col gap-7">
                            <div
                                className="truncate font-bold uppercase tracking-[0.04em] text-ink"
                                style={{ fontSize: 'calc(var(--u) * 26)' }}
                            >
                                {entry.name}
                            </div>
                            <div
                                className="font-semibold uppercase tracking-[0.12em] text-ink-mute"
                                style={{ fontSize: 'calc(var(--u) * 14)' }}
                            >
                                {winLabel(wins(entry))}
                            </div>
                        </div>
                        <div
                            className="font-display text-ink"
                            style={{ fontSize: 'calc(var(--u) * 30)' }}
                        >
                            {points(entry.points)}
                        </div>
                    </div>
                ) : null,
            )}
        </div>
    );
};

export default Podium;
