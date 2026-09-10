import type { BoardState } from '../../schemas';

interface PointsPerGameProps {
    board: BoardState;
    /** Farbe je gameId, aus derselben Reihenfolge wie die Legende. */
    colorOf: (gameId: string) => string;
}

const points = (value: number) => value.toFixed(1).replace('.', ',');

/**
 * Gestapelte Balken: je Teilnehmer ein Segment pro Disziplin.
 *
 * Nur die Summe zu zeigen würde verbergen, wo jemand stark und wo schwach
 * war — und eine Nicht-Teilnahme bliebe unsichtbar. Genau die soll als Lücke
 * im Balken auffallen, weil sie nach §4.3 Punkte kostet.
 */
const PointsPerGame = ({ board, colorOf }: PointsPerGameProps) => {
    const leader = board.standings[0]?.points ?? 0;

    return (
        <div className="flex h-660 w-880 flex-col border-2 border-line bg-surface/85 shadow-card">
            <div className="flex items-center justify-between gap-12 border-b-2 border-line px-20 py-14">
                <div
                    className="font-display tracking-[0.14em] text-ink"
                    style={{ fontSize: 'calc(var(--u) * 17)' }}
                >
                    PUNKTE JE DISZIPLIN
                </div>
                <div
                    className="font-semibold uppercase tracking-[0.12em] text-ink-mute"
                    style={{ fontSize: 'calc(var(--u) * 13)' }}
                >
                    Skala 0 – {points(leader)}
                </div>
            </div>

            <div className="flex flex-wrap gap-x-20 gap-y-8 border-b-2 border-line px-20 py-13">
                {board.games.map((game) => (
                    <div key={game.game.id} className="flex items-center gap-8">
                        <span
                            className="h-13 w-13"
                            style={{ backgroundColor: colorOf(game.game.id) }}
                        />
                        <span
                            className="font-semibold text-ink-soft"
                            style={{ fontSize: 'calc(var(--u) * 13)' }}
                        >
                            {game.game.title}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex grow flex-col justify-center gap-14 px-20 py-18">
                {board.standings.map((entry) => {
                    const segments = board.games.map((game) => ({
                        gameId: game.game.id,
                        title: game.game.title,
                        points:
                            game.entries.find(
                                (e) => e.entrantId === entry.entrantId,
                            )?.points ?? 0,
                    }));
                    const missing = segments.filter((s) => s.points === 0);

                    return (
                        <div
                            key={entry.entrantId}
                            className="flex flex-col gap-8"
                        >
                            <div className="flex items-baseline justify-between gap-12">
                                <span
                                    className="truncate font-bold uppercase tracking-[0.04em] text-ink"
                                    style={{ fontSize: 'calc(var(--u) * 17)' }}
                                >
                                    {entry.rank} · {entry.name}
                                </span>
                                <span
                                    className={`shrink-0 font-display ${entry.rank === 1 ? 'text-gold' : 'text-ink'}`}
                                    style={{ fontSize: 'calc(var(--u) * 15)' }}
                                >
                                    {points(entry.points)}
                                </span>
                            </div>
                            <div className="flex h-32 border border-line bg-surface-2">
                                {segments
                                    .filter((segment) => segment.points > 0)
                                    .map((segment) => (
                                        <div
                                            key={segment.gameId}
                                            // shrink-0: die Breite ist die
                                            // Aussage. Ohne das gäbe das
                                            // Segment Platz für den Hinweis
                                            // daneben ab und der Balken löge.
                                            className="flex shrink-0 items-center justify-center font-display text-bg"
                                            style={{
                                                width: `${leader === 0 ? 0 : (segment.points / leader) * 100}%`,
                                                backgroundColor: colorOf(
                                                    segment.gameId,
                                                ),
                                                fontSize: 'calc(var(--u) * 11)',
                                            }}
                                            title={segment.title}
                                        >
                                            {points(segment.points)}
                                        </div>
                                    ))}
                                {missing.length > 0 && (
                                    // min-w-0, damit der Hinweis schrumpft
                                    // statt über den Balken hinauszulaufen:
                                    // beim Führenden ist gar kein Platz mehr.
                                    <div
                                        className="flex min-w-0 items-center truncate pl-12 font-semibold uppercase tracking-[0.12em] text-ink-mute"
                                        style={{
                                            fontSize: 'calc(var(--u) * 12)',
                                        }}
                                    >
                                        {missing.map((s) => s.title).join(', ')}{' '}
                                        nicht gewertet · 0
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PointsPerGame;
