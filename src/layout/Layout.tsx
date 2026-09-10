import { NavLink, Outlet } from 'react-router';
import PinLock from '../components/layout/PinLock';
import { useTournamentContext } from '../hooks/useTournamentContext';

const TABS = [
    { to: '/control', label: 'WERTUNG', end: true },
    { to: '/control/games', label: 'DISZIPLINEN', end: false },
    { to: '/control/teams', label: 'TEAMS', end: false },
    { to: '/control/players', label: 'SPIELER', end: false },
    { to: '/control/tournament', label: 'TURNIER', end: false },
];

/**
 * Die Schale des Control-Panels (PROJEKT.md §2): Kopfzeile mit dem aktiven
 * Turnier, Reiter, Inhalt. Bewusst ohne die Board-Skalierung — hier wird
 * bedient, auf einem Tablet, in normalen Maßen.
 */
const Layout = () => {
    const { tournament } = useTournamentContext();

    return (
        <div className="flex min-h-screen flex-col bg-bg text-ink">
            <header className="flex h-[74px] shrink-0 items-center justify-between gap-5 border-b-2 border-line bg-surface px-6">
                <div className="flex items-center gap-4">
                    <span className="font-display text-lg tracking-[0.14em] text-magenta">
                        CONTROL
                    </span>
                    <span className="h-6 w-0.5 bg-line" aria-hidden />
                    {tournament ? (
                        <span className="flex items-center gap-2.5 border-2 border-line-strong bg-bg px-3.5 py-2">
                            <span className="text-[15px] font-semibold text-ink">
                                {tournament.title}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute">
                                {tournament.mode === 'team'
                                    ? 'Teamturnier'
                                    : 'Einzelturnier'}
                            </span>
                        </span>
                    ) : (
                        <span className="text-sm text-ink-mute">
                            Kein Turnier angelegt
                        </span>
                    )}
                </div>
                <PinLock />
            </header>

            <nav className="flex h-[54px] shrink-0 items-stretch border-b-2 border-line bg-bg px-6">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.end}
                        className={({ isActive }) =>
                            `flex items-center border-b-4 px-5.5 font-display text-[13px] tracking-[0.1em] transition-colors ${
                                isActive
                                    ? 'border-magenta text-ink'
                                    : 'border-transparent text-ink-mute hover:text-ink-soft'
                            }`
                        }
                    >
                        {tab.label}
                    </NavLink>
                ))}
            </nav>

            <main className="min-h-0 grow p-6">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
