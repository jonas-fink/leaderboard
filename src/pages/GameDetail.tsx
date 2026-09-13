import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LeaderChartCard, ScoreFormModal } from '../components';
import { useLeaderboard } from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';

/**
 * Ein Board mit vollständiger Rangliste statt nur Top 5.
 *
 * specs/002 (BE-8): `GET /api/leaderboard/:slug` verlangt jetzt `tournamentId`
 * — zwei Turniere könnten sonst dieselbe Disziplin-Slug tragen (AC-3.6). Die
 * Route trägt keine `tournamentId`, deshalb kommt sie aus dem aktuellen
 * Turnier des Control-Panels, derselben Heuristik wie in `Scoring.tsx`.
 */
const GameDetail = () => {
    const { slug = '' } = useParams();
    const { tournament } = useTournamentContext();
    const { data, isLoading, error } = useLeaderboard(slug, tournament?.id);
    const [scoreOpen, setScoreOpen] = useState(false);

    return (
        <section className="p-4 md:p-0">
            <Link
                to="/control"
                className="mb-4 inline-block text-sm font-semibold text-ink-mute transition-colors hover:text-cyan"
            >
                ← Dashboard
            </Link>

            {!tournament && (
                <p className="border-2 border-line bg-surface p-6 text-ink-mute">
                    Es gibt noch kein Turnier. Lege im Reiter TURNIER eines
                    an.
                </p>
            )}

            {tournament && error && (
                <p className=" border-2 border-orange bg-orange/10 px-4 py-3 text-sm text-orange">
                    {error.message}
                </p>
            )}

            {tournament && isLoading && (
                <div className="h-96 animate-pulse bg-surface-2" />
            )}

            {tournament && data && (
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
                            entrantType={tournament.mode}
                            onClose={() => setScoreOpen(false)}
                        />
                    )}
                </>
            )}
        </section>
    );
};

export default GameDetail;
