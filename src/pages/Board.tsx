import { useParams } from 'react-router';
import {
    AnnouncementBanner,
    ExitLink,
    GamePanel,
    StandingsPanel,
} from '../components/board';
import { useBoard } from '../hooks/useBoard';
import { useRotation } from '../hooks/useRotation';

/** §6: vier Kartenplätze im 2×2-Raster, der Rest rotiert durch. */
const SLOTS = 4;

/**
 * Die Leinwand (PROJEKT.md §6). Keine Bedienelemente: der Rechner am Beamer
 * öffnet diese Seite und wird für den Rest des Abends nicht angefasst.
 *
 * Der Canvas ist auf 1600×900 gezeichnet, alle Maße hängen an `--u` — ein
 * Canvas-Pixel, gekoppelt an die kleinere Viewport-Achse. Die Auflösung des
 * Zielgeräts muss dafür nicht bekannt sein.
 */
const Board = () => {
    const { tournamentSlug = '' } = useParams();
    const { board, toasts, connected, error } = useBoard(tournamentSlug);

    // Eine Karte mit frischer Wertung bleibt stehen, solange ihr Toast steht.
    const held = toasts.some((toast) => toast.gameId);
    const rotation = useRotation(board?.games ?? [], SLOTS, held);

    if (error) {
        return (
            <div className="board flex h-screen items-center justify-center bg-bg">
                <p className="border-2 border-orange px-24 py-16 font-display text-orange">
                    {error.message}
                </p>
            </div>
        );
    }

    if (!board) {
        return (
            <div className="board flex h-screen items-center justify-center bg-bg">
                <p className="font-display tracking-[0.2em] text-ink-mute">
                    LADE …
                </p>
            </div>
        );
    }

    const scored = board.games.reduce(
        (sum, game) => sum + game.entries.length,
        0,
    );

    return (
        <div className="board flex h-screen items-center justify-center overflow-hidden bg-bg">
            <div
                className="relative overflow-hidden bg-bg font-sans text-ink"
                style={{
                    width: 'calc(var(--u) * 1600)',
                    height: 'calc(var(--u) * 900)',
                    backgroundImage:
                        'radial-gradient(ellipse 68% 42% at 50% 106%, rgb(255 63 164 / 0.2), transparent 70%), linear-gradient(rgb(47 30 107 / 0.28) 1px, transparent 1px), linear-gradient(90deg, rgb(47 30 107 / 0.28) 1px, transparent 1px)',
                    backgroundSize:
                        'auto, calc(var(--u) * 40) calc(var(--u) * 40), calc(var(--u) * 40) calc(var(--u) * 40)',
                }}
            >
                {/* Kopfzeile */}
                <div className="absolute inset-x-40 top-36 flex items-end justify-between gap-24">
                    <div className="flex flex-col gap-8">
                        <ExitLink>Future Space Kassel</ExitLink>
                        <div
                            className="font-display leading-none tracking-[0.04em] text-ink [text-shadow:0_0_18px_rgb(33_230_216/0.45)]"
                            style={{ fontSize: 'calc(var(--u) * 40)' }}
                        >
                            {board.tournament.title.toUpperCase()}
                        </div>
                    </div>
                    <div className="flex items-center gap-14">
                        <div className="flex items-center gap-10 border-2 border-cyan bg-cyan/10 px-14 py-9 shadow-[4px_4px_0_var(--color-bg)]">
                            <div className="pulse-status h-10 w-10 text-cyan" />
                            <div
                                className="font-display tracking-[0.16em] text-cyan"
                                style={{ fontSize: 'calc(var(--u) * 13)' }}
                            >
                                {board.tournament.status.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gesamtwertung — linkes Drittel, dauerhaft sichtbar */}
                <div className="absolute left-40 top-130 h-690 w-580">
                    <StandingsPanel
                        standings={board.standings}
                        mode={board.tournament.mode}
                    />
                </div>

                {/* Disziplinen im 2×2-Raster */}
                <div className="absolute left-660 top-130 grid h-690 w-900 grid-cols-2 grid-rows-2 gap-20">
                    {rotation.visible.map((game) => (
                        <GamePanel
                            key={game.game.id}
                            game={game}
                            standings={board.standings}
                        />
                    ))}
                </div>

                {/* Toasts legen sich über die Karten */}
                <div className="absolute bottom-104 left-660 w-900">
                    <AnnouncementBanner
                        toasts={toasts}
                        standings={board.standings}
                    />
                </div>

                {/* Statuszeile */}
                <div className="absolute inset-x-40 bottom-34 flex h-46 items-center justify-between gap-20 border-2 border-line bg-surface/90 px-18">
                    <div className="flex items-center gap-12">
                        <div
                            className="font-semibold uppercase tracking-[0.16em] text-ink-mute"
                            style={{ fontSize: 'calc(var(--u) * 13)' }}
                        >
                            {rotation.pages > 1
                                ? 'Nächste Disziplin in'
                                : 'Alle Disziplinen sichtbar'}
                        </div>
                        {rotation.pages > 1 && (
                            <>
                                <div
                                    className="font-display text-cyan"
                                    style={{ fontSize: 'calc(var(--u) * 15)' }}
                                >
                                    {rotation.secondsLeft}s
                                </div>
                                <div className="ml-10 flex items-center gap-6">
                                    {Array.from(
                                        { length: rotation.pages },
                                        (_, i) => (
                                            <div
                                                key={i}
                                                className={`h-6 ${i === rotation.page ? 'w-22 bg-magenta' : 'w-10 bg-line'}`}
                                            />
                                        ),
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-26">
                        <div
                            className="font-semibold uppercase tracking-[0.16em] text-ink-mute"
                            style={{ fontSize: 'calc(var(--u) * 13)' }}
                        >
                            {board.games.length} Disziplinen ·{' '}
                            {board.standings.length}{' '}
                            {board.tournament.mode === 'team'
                                ? 'Teams'
                                : 'Spieler'}{' '}
                            · {scored} Wertungen
                        </div>
                        <div className="flex items-center gap-9">
                            <div
                                className={`pulse-status h-8 w-8 ${connected ? 'text-green' : 'text-orange'}`}
                            />
                            <div
                                className={`font-display tracking-[0.12em] ${connected ? 'text-green' : 'text-orange'}`}
                                style={{ fontSize: 'calc(var(--u) * 11)' }}
                            >
                                {connected ? 'VERBUNDEN' : 'GETRENNT'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scanlines — reine Dekoration, deshalb aus dem Baum genommen */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-25"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.5) 0 2px, transparent 2px 4px)',
                    }}
                />
            </div>
        </div>
    );
};

export default Board;
