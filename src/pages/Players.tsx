import { useState } from 'react';
import { MdOutlineAdd } from 'react-icons/md';
import { PlayerCard, PlayerDetailModal, PlayerFormModal } from '../components';
import { usePlayers } from '../hooks';
import type { Player } from '../schemas';

const Players = () => {
    const { data: players, isLoading, error } = usePlayers();

    const [detail, setDetail] = useState<Player | null>(null);
    // null = Modal zu, undefined = Anlegen, Player = Bearbeiten
    const [editing, setEditing] = useState<Player | undefined | null>(null);

    return (
        <section className="p-4 md:p-0">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-ink">Spieler</h1>
                <p className="text-sm text-ink-mute">
                    Karte anklicken für Medaillen und vergangene Spiele.
                </p>
            </header>

            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error.message}
                </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
                {isLoading &&
                    Array.from({ length: 4 }, (_, i) => (
                        <div
                            key={i}
                            className="h-20 animate-pulse rounded-2xl bg-surface-2"
                        />
                    ))}

                {players?.map((player) => (
                    <PlayerCard
                        key={player.id}
                        player={player}
                        onClick={setDetail}
                    />
                ))}

                {!isLoading && (
                    <button
                        type="button"
                        onClick={() => setEditing(undefined)}
                        className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-ink-mute transition-colors hover:border-arcane-teal hover:text-arcane-teal"
                    >
                        <MdOutlineAdd size={24} />
                        <span className="text-sm font-semibold">
                            Spieler anlegen
                        </span>
                    </button>
                )}
            </div>

            <PlayerDetailModal
                player={detail}
                onClose={() => setDetail(null)}
                onEdit={(player) => {
                    setDetail(null);
                    setEditing(player);
                }}
            />

            {editing !== null && (
                <PlayerFormModal
                    key={editing?.id ?? 'new'}
                    open
                    player={editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </section>
    );
};

export default Players;
