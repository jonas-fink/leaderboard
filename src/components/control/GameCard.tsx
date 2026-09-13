import { useState } from 'react';
import { MdPushPin, MdOutlinePushPin, MdEdit } from 'react-icons/md';
import type { Game, GameStatus, UpdateGameInput } from '../../schemas';

interface GameCardProps {
    game: Game;
    onTogglePin: (game: Game) => void;
    onEdit: (game: Game) => void;
    onSetStatus: (game: Game, patch: UpdateGameInput) => void;
    pinPending?: boolean;
}

const STATUS: { value: GameStatus; label: string; tone: string }[] = [
    { value: 'upcoming', label: 'GEPLANT', tone: 'border-line-strong text-ink' },
    { value: 'running', label: 'LÄUFT', tone: 'border-cyan text-cyan' },
    { value: 'finished', label: 'BEENDET', tone: 'border-gold text-gold' },
];

/** Voreingestellte Rundendauer in Minuten. */
const DEFAULT_MINUTES = 15;

/**
 * Der Zielzeitpunkt des Countdowns aus der eingetippten Dauer. Steht auf
 * Modulebene, weil `Date.now()` unrein ist und im Komponentenkörper — auch
 * in einem Handler — von `react-hooks/purity` zu Recht angemahnt wird.
 *
 * Eine unbrauchbare Eingabe ergibt `null`: die Disziplin startet dann ohne
 * Countdown statt gar nicht. Der Status ist das Wichtige, die Uhr die Zugabe.
 */
const countdownTarget = (minutes: string): string | null => {
    const value = Number(minutes);
    return Number.isFinite(value) && value > 0
        ? new Date(Date.now() + value * 60_000).toISOString()
        : null;
};

/**
 * Cover als Hintergrund, darauf Titel und Genre. Der Pin entscheidet, ob das
 * Game als Chart auf dem Dashboard erscheint.
 *
 * Der Status schaltet unten direkt auf der Karte: „LÄUFT" setzt zugleich
 * `endsAt` auf jetzt + Minuten, woraus das Board seinen Countdown rechnet.
 * Die beiden anderen räumen ihn wieder ab — ein Countdown an einer geplanten
 * oder beendeten Disziplin wäre eine Lüge auf der Leinwand.
 */
export const GameCard = ({
    game,
    onTogglePin,
    onEdit,
    onSetStatus,
    pinPending,
}: GameCardProps) => {
    const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));

    const setStatus = (status: GameStatus) => {
        if (status !== 'running') {
            onSetStatus(game, { status, endsAt: null });
            return;
        }
        onSetStatus(game, { status, endsAt: countdownTarget(minutes) });
    };

    return (
        <article className="group relative isolate flex h-56 flex-col justify-end overflow-hidden border-2 border-line shadow-card transition-shadow hover:shadow-float">
            {game.coverUrl ? (
                <img
                    src={game.coverUrl}
                    alt=""
                    className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            ) : (
                <div className="absolute inset-0 -z-10 bg-surface" />
            )}
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/60 to-bg/25" />

            <div className="absolute right-3 top-3 flex gap-2">
                <button
                    type="button"
                    onClick={() => onEdit(game)}
                    aria-label={`${game.title} bearbeiten`}
                    className="cursor-pointer border-2 border-line-strong bg-bg/70 p-2 text-ink backdrop-blur-sm transition-colors hover:bg-bg/85"
                >
                    <MdEdit size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => onTogglePin(game)}
                    disabled={pinPending}
                    aria-pressed={game.pinned}
                    aria-label={
                        game.pinned
                            ? `${game.title} vom Dashboard nehmen`
                            : `${game.title} aufs Dashboard pinnen`
                    }
                    className={`cursor-pointer  border-2 p-2 backdrop-blur-sm transition-colors disabled:opacity-50 ${
                        game.pinned
                            ? 'border-gold/60 bg-gold/25 text-gold'
                            : 'border-line-strong bg-bg/70 text-ink hover:bg-bg/85'
                    }`}
                >
                    {game.pinned ? (
                        <MdPushPin size={16} />
                    ) : (
                        <MdOutlinePushPin size={16} />
                    )}
                </button>
            </div>

            <div className="p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
                    {game.genre}
                </span>
                <h3 className="truncate text-xl font-bold text-ink">
                    {game.title}
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                    {game.primaryMetric.label}
                    {game.pinned && ' · auf dem Dashboard'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {STATUS.map((option) => {
                        const active = game.status === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setStatus(option.value)}
                                className={`cursor-pointer border-2 px-2 py-1 font-display text-[11px] tracking-[0.1em] backdrop-blur-sm transition-colors ${
                                    active
                                        ? `${option.tone} bg-bg/80`
                                        : 'border-line bg-bg/50 text-ink-mute hover:border-line-strong hover:text-ink-soft'
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                    <label className="ml-auto flex items-center gap-1 text-[11px] text-ink-mute">
                        <input
                            type="number"
                            min={1}
                            value={minutes}
                            onChange={(event) =>
                                setMinutes(event.target.value)
                            }
                            aria-label={`Rundendauer für ${game.title} in Minuten`}
                            className="w-12 border-2 border-line bg-bg/70 px-1 py-1 text-center text-ink backdrop-blur-sm"
                        />
                        min
                    </label>
                </div>
            </div>
        </article>
    );
};
