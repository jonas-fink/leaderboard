import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
    ExitLink,
    GameWinners,
    PointsPerGame,
    Podium,
    RevealStage,
} from '../components/board';
import { useBoard } from '../hooks/useBoard';

/**
 * Die sechs Akzentfarben in der Reihenfolge des Canvas. Mehr Disziplinen als
 * Farben laufen wieder von vorn — bei sechs parallelen Spielen ist der Abend
 * ohnehin voll.
 */
const GAME_COLORS = [
    'var(--color-magenta)',
    'var(--color-cyan)',
    'var(--color-gold)',
    'var(--color-violet)',
    'var(--color-green)',
    'var(--color-orange)',
];

/** Tasten des Moderators. Bild auf/ab, weil Presenter-Clicker genau die senden. */
const NEXT_KEYS = [' ', 'Enter', 'ArrowRight', 'PageDown'];
const BACK_KEYS = ['ArrowLeft', 'Backspace', 'PageUp'];

/**
 * Die Siegerehrung (PROJEKT.md §2). Zeigt **alle** Disziplinen, auch die
 * ungepinnten — deshalb `allGames`. Sonst fehlten Punkte, die in der
 * Gesamtwertung längst stecken, und der Balken ergäbe die Summe nicht.
 */
const Result = () => {
    const { userSlug = '', slug = '' } = useParams();
    const { board, error } = useBoard(userSlug, slug, true);

    // Erst die Plätze einzeln vom letzten aufwärts, danach die Gesamtansicht.
    // 0 = Vorspann, 1…total = ein Platz je Schritt, total + 1 = alles.
    // ponytail: ein Reload beginnt von vorn; `?step=` erst, wenn das stört.
    const [step, setStep] = useState(0);
    const total = board?.standings.length ?? 0;
    const advance = () => setStep((s) => Math.min(s + 1, total + 1));

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (NEXT_KEYS.includes(event.key)) {
                setStep((s) => Math.min(s + 1, total + 1));
            } else if (BACK_KEYS.includes(event.key)) {
                setStep((s) => Math.max(s - 1, 0));
            } else if (event.key === 'Escape') {
                setStep(total + 1);
            } else {
                return;
            }
            // Leertaste würde sonst scrollen, Enter einen fokussierten Link öffnen.
            event.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [total]);

    if (error || !board) {
        return (
            <div className="board flex h-screen items-center justify-center bg-bg">
                <p
                    className={`font-display tracking-[0.2em] ${error ? 'border-2 border-orange px-24 py-16 text-orange' : 'text-ink-mute'}`}
                >
                    {error ? error.message : 'LADE …'}
                </p>
            </div>
        );
    }

    const colorOf = (gameId: string) => {
        const index = board.games.findIndex((game) => game.game.id === gameId);
        return GAME_COLORS[index % GAME_COLORS.length]!;
    };

    // In wie vielen Disziplinen jemand überhaupt gewertet wurde.
    const played = new Map<string, number>();
    for (const game of board.games) {
        for (const entry of game.entries) {
            played.set(entry.entrantId, (played.get(entry.entrantId) ?? 0) + 1);
        }
    }

    const awarded = board.standings.reduce(
        (sum, entry) => sum + entry.points,
        0,
    );

    return (
        <div className="board flex h-screen items-center justify-center overflow-hidden bg-bg">
            <div
                className="relative overflow-hidden bg-bg font-sans text-ink"
                onClick={advance}
                style={{
                    width: 'calc(var(--u) * 1600)',
                    height: 'calc(var(--u) * 900)',
                    backgroundImage:
                        'radial-gradient(ellipse 75% 51% at 22% 40%, rgb(255 210 63 / 0.16), transparent 70%), linear-gradient(rgb(47 30 107 / 0.28) 1px, transparent 1px), linear-gradient(90deg, rgb(47 30 107 / 0.28) 1px, transparent 1px)',
                    backgroundSize:
                        'auto, calc(var(--u) * 40) calc(var(--u) * 40), calc(var(--u) * 40) calc(var(--u) * 40)',
                }}
            >
                <div className="absolute inset-x-40 top-36 flex items-end justify-between gap-24">
                    <div className="flex flex-col gap-8">
                        <ExitLink tone="text-gold">
                            {board.tournament.title}
                        </ExitLink>
                        <div
                            className="font-display leading-none tracking-[0.04em] text-ink [text-shadow:0_0_20px_rgb(255_210_63/0.5)]"
                            style={{ fontSize: 'calc(var(--u) * 40)' }}
                        >
                            SIEGEREHRUNG
                        </div>
                    </div>
                    <div
                        className="border-2 border-line bg-surface px-14 py-9 font-semibold uppercase tracking-[0.14em] text-ink-soft shadow-[4px_4px_0_var(--color-bg)]"
                        style={{ fontSize: 'calc(var(--u) * 14)' }}
                    >
                        {board.games.length} Disziplinen ·{' '}
                        {board.standings.length}{' '}
                        {board.tournament.mode === 'team' ? 'Teams' : 'Spieler'}{' '}
                        · {awarded.toFixed(1).replace('.', ',')} Punkte vergeben
                    </div>
                </div>

                {step <= total ? (
                    <RevealStage
                        standings={board.standings}
                        step={step}
                        played={played}
                        gameCount={board.games.length}
                        teams={board.tournament.mode === 'team'}
                    />
                ) : (
                    <>
                        <div className="absolute left-40 top-130">
                            <Podium
                                standings={board.standings}
                                played={played}
                                gameCount={board.games.length}
                            />
                        </div>

                        <div className="absolute left-680 top-130">
                            <PointsPerGame board={board} colorOf={colorOf} />
                        </div>

                        <div className="absolute inset-x-40 bottom-34">
                            <GameWinners board={board} colorOf={colorOf} />
                        </div>
                    </>
                )}

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

export default Result;
