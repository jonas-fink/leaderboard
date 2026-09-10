import type { BoardState } from '../../schemas';

interface GameWinnersProps {
    board: BoardState;
    colorOf: (gameId: string) => string;
}

/**
 * Die Fußzeile der Siegerehrung: wer welche Disziplin gewonnen hat. Die
 * Gesamtwertung darüber verrät das nicht — ein Teilnehmer kann ohne einen
 * einzigen Sieg vorn liegen, wenn er überall vorne mitläuft.
 */
const GameWinners = ({ board, colorOf }: GameWinnersProps) => (
    <div className="flex h-66 items-stretch gap-12">
        <div
            className="flex items-center whitespace-nowrap border-2 border-line bg-surface/90 px-18 font-display tracking-[0.14em] text-ink-mute"
            style={{ fontSize: 'calc(var(--u) * 12)' }}
        >
            SIEGER
            <br />
            JE SPIEL
        </div>

        {board.games.map((game) => {
            const winner = game.entries.find((entry) => entry.rank === 1);
            const name = board.standings.find(
                (entry) => entry.entrantId === winner?.entrantId,
            )?.name;

            return (
                <div
                    key={game.game.id}
                    className="flex min-w-0 grow flex-col justify-center gap-4 border-2 border-line bg-surface/90 px-16"
                    style={{ borderLeftColor: colorOf(game.game.id) }}
                >
                    <div
                        className="truncate font-semibold uppercase tracking-[0.12em] text-ink-mute"
                        style={{ fontSize: 'calc(var(--u) * 12)' }}
                    >
                        {game.game.title}
                    </div>
                    <div
                        className="truncate font-bold text-ink"
                        style={{ fontSize: 'calc(var(--u) * 17)' }}
                    >
                        {name ?? 'noch offen'}
                    </div>
                </div>
            );
        })}
    </div>
);

export default GameWinners;
