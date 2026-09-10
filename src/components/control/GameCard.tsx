import { MdPushPin, MdOutlinePushPin, MdEdit } from 'react-icons/md';
import type { Game } from '../../schemas';

interface GameCardProps {
    game: Game;
    onTogglePin: (game: Game) => void;
    onEdit: (game: Game) => void;
    pinPending?: boolean;
}

/**
 * Cover als Hintergrund, darauf Titel und Genre. Der Pin entscheidet, ob das
 * Game als Chart auf dem Dashboard erscheint.
 */
export const GameCard = ({
    game,
    onTogglePin,
    onEdit,
    pinPending,
}: GameCardProps) => (
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
        </div>
    </article>
);
