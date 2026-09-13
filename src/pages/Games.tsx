import { useState } from 'react';
import { MdOutlineAdd } from 'react-icons/md';
import { GameCard, GameFormModal } from '../components';
import { useGames, useUpdateGame } from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';
import type { Game, UpdateGameInput } from '../schemas';

const Games = () => {
    const { tournament } = useTournamentContext();
    // Games gehören zu genau einem Turnier (specs/002, BE-8) — ohne
    // `tournamentId` antwortet der Server 400.
    const { data: games, isLoading, error } = useGames(tournament?.id);
    const updateGame = useUpdateGame();

    // null = Modal zu, undefined = Anlegen, Game = Bearbeiten
    const [editing, setEditing] = useState<Game | undefined | null>(null);

    const togglePin = (game: Game) =>
        updateGame.mutate({ id: game.id, patch: { pinned: !game.pinned } });

    // Der Controller sendet nach jedem PATCH `board:update` — die Leinwand
    // bekommt Status und Countdown also ohne zweiten Handgriff.
    const setStatus = (game: Game, patch: UpdateGameInput) =>
        updateGame.mutate({ id: game.id, patch });

    const pinnedCount = games?.filter((game) => game.pinned).length ?? 0;

    if (!tournament) {
        return (
            <p className="border-2 border-line bg-surface p-6 text-ink-mute">
                Es gibt noch kein Turnier. Lege im Reiter TURNIER eines an.
            </p>
        );
    }

    return (
        <section className="p-4 md:p-0">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-ink">Games</h1>
                    <p className="text-sm text-ink-mute">
                        Angeheftete Games erscheinen als Chart auf dem Dashboard
                        — aktuell {pinnedCount}.
                    </p>
                </div>
            </header>

            {error && (
                <p className=" border-2 border-orange bg-orange/10 px-4 py-3 text-sm text-orange">
                    {error.message}
                </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-6">
                {isLoading &&
                    Array.from({ length: 3 }, (_, i) => (
                        <div
                            key={i}
                            className="h-56 animate-pulse bg-surface-2"
                        />
                    ))}

                {games?.map((game) => (
                    <GameCard
                        key={game.id}
                        game={game}
                        onTogglePin={togglePin}
                        onEdit={setEditing}
                        onSetStatus={setStatus}
                        pinPending={
                            updateGame.isPending &&
                            updateGame.variables?.id === game.id
                        }
                    />
                ))}

                {!isLoading && (
                    <button
                        type="button"
                        onClick={() => setEditing(undefined)}
                        className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-line text-ink-mute transition-colors hover:border-cyan hover:text-cyan"
                    >
                        <MdOutlineAdd size={40} />
                        <span className="text-sm font-semibold">
                            Game anlegen
                        </span>
                    </button>
                )}
            </div>

            {editing !== null && (
                <GameFormModal
                    // Neu mounten, damit das Formular pro Game frisch startet.
                    key={editing?.id ?? 'new'}
                    open
                    game={editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </section>
    );
};

export default Games;
