import type { Player } from '../schemas';

interface PlayerCardProps {
    player: Player;
    onClick: (player: Player) => void;
}

/** Ländercode -> Flaggen-Emoji über die Regional Indicator Symbols. */
const flag = (countryCode?: string) =>
    countryCode
        ? String.fromCodePoint(
              ...[...countryCode.toUpperCase()].map(
                  (char) => 0x1f1e6 + char.charCodeAt(0) - 65,
              ),
          )
        : null;

export const PlayerCard = ({ player, onClick }: PlayerCardProps) => (
    <button
        type="button"
        onClick={() => onClick(player)}
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-float"
    >
        {player.avatarUrl ? (
            <img
                src={player.avatarUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
            />
        ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-runeterra-sapphire to-midnight-cobal text-sm font-bold uppercase text-logo">
                {player.username.slice(0, 2)}
            </div>
        )}

        <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{player.username}</p>
            <p className="text-xs text-ink-mute">
                {flag(player.countryCode) ?? 'Details ansehen'}
            </p>
        </div>
    </button>
);
