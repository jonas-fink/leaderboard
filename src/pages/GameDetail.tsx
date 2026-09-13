import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { LeaderChartCard, ScoreFormModal } from '../components';
import { useLeaderboard, useTournaments } from '../hooks';

/** Ein Board mit vollständiger Rangliste statt nur Top 5. */
const GameDetail = () => {
    const { slug = '' } = useParams();
    const { data, isLoading, error } = useLeaderboard(slug);
    const { data: tournaments = [] } = useTournaments();
    const [scoreOpen, setScoreOpen] = useState(false);

    // Der Modus entscheidet, ob das Formular Spieler oder Teams anbietet
    // (PROJEKT.md §3) — hier über die eigene Disziplin ermittelt statt über
    // `useTournamentContext`, das nur das zuletzt gestartete Turnier kennt und
    // damit am falschen Turnier vorbeizeigen könnte.
    const tournament = data
        ? tournaments.find((t) => t.id === data.game.tournamentId)
        : undefined;

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
                    {scoreOpen && tournament && (
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
