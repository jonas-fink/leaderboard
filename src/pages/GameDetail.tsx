import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LeaderChartCard, ScoreFormModal } from '../components';
import { useLeaderboard } from '../hooks';

/** Ein Board mit vollständiger Rangliste statt nur Top 5. */
const GameDetail = () => {
    const { slug = '' } = useParams();
    const { data, isLoading, error } = useLeaderboard(slug);
    const [scoreOpen, setScoreOpen] = useState(false);

    return (
        <section className="p-4 md:p-0">
            <Link
                to="/control"
                className="mb-4 inline-block text-sm font-semibold text-ink-mute transition-colors hover:text-cyan"
            >
                ← Dashboard
            </Link>

            {error && (
                <p className=" border-2 border-orange bg-orange/10 px-4 py-3 text-sm text-orange">
                    {error.message}
                </p>
            )}

            {isLoading && <div className="h-96 animate-pulse bg-surface-2" />}

            {data && (
                <>
                    <LeaderChartCard
                        data={data}
                        limit={Infinity}
                        onSubmitScore={() => setScoreOpen(true)}
                    />
                    {scoreOpen && (
                        <ScoreFormModal
                            open
                            game={data.game}
                            onClose={() => setScoreOpen(false)}
                        />
                    )}
                </>
            )}
        </section>
    );
};

export default GameDetail;
