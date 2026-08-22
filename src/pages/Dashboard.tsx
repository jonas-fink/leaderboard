import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { MdOutlineAdd } from 'react-icons/md';
import { LeaderChartCard, ScoreFormModal } from '../components';
import { useLeaderboards } from '../hooks';
import type { LeaderboardChartData } from '../schemas';

const Dashboard = () => {
    const navigate = useNavigate();
    const { data: charts, isLoading, error } = useLeaderboards();
    const [scoreFor, setScoreFor] = useState<LeaderboardChartData | null>(null);

    // Stabile Referenzen, sonst zieht jeder Render die memoisierten Karten mit.
    const handleViewAll = useCallback(
        (slug: string) => navigate(`/games/${slug}`),
        [navigate],
    );
    const handleSubmitScore = useCallback(
        (data: LeaderboardChartData) => setScoreFor(data),
        [],
    );

    return (
        <section className="p-4 md:p-0">
            {error && (
                <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error.message}
                </p>
            )}

            <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-8">
                {isLoading &&
                    Array.from({ length: 2 }, (_, i) => (
                        <div
                            key={i}
                            className="h-96 animate-pulse rounded-2xl bg-surface-2"
                        />
                    ))}

                {charts?.map((data) => (
                    <LeaderChartCard
                        key={data.game.id}
                        data={data}
                        onViewAll={handleViewAll}
                        onSubmitScore={handleSubmitScore}
                    />
                ))}

                {!isLoading && charts?.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-line bg-surface p-10 text-center">
                        <p className="font-semibold text-ink">
                            Noch kein Game auf dem Dashboard
                        </p>
                        <p className="mt-1 text-sm text-ink-mute">
                            Unter „Games" ein Spiel anheften, dann erscheint es
                            hier als Chart.
                        </p>
                    </div>
                )}

                {!isLoading && (
                    <button
                        type="button"
                        onClick={() => navigate('/games')}
                        className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-ink-mute transition-colors hover:border-arcane-teal hover:text-arcane-teal"
                    >
                        <MdOutlineAdd size={48} />
                        <span className="text-sm font-semibold">
                            Games verwalten
                        </span>
                    </button>
                )}
            </div>

            {scoreFor && (
                <ScoreFormModal
                    key={scoreFor.game.id}
                    open
                    game={scoreFor.game}
                    onClose={() => setScoreFor(null)}
                />
            )}
        </section>
    );
};

export default Dashboard;
