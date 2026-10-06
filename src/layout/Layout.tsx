import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { IoLogOutOutline } from 'react-icons/io5';
import {
    selectTournament,
    useTournamentContext,
} from '../hooks/useTournamentContext';
import { useLogout, useMe } from '../hooks';

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
    const { tournament, tournaments } = useTournamentContext();
    const { data: me } = useMe();
    const logout = useLogout();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navRef = useRef<HTMLElement>(null);

    // Auf dem Handy scrollen die Reiter seitlich — der aktive soll sichtbar sein.
    useEffect(() => {
        navRef.current
            ?.querySelector('[aria-current="page"]')
            ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [pathname]);

    const handleLogout = () =>
        logout.mutate(undefined, {
            onSuccess: () => navigate('/login', { replace: true }),
        });

    return (
        <div className="flex min-h-screen flex-col bg-bg text-ink">
            <header className="flex min-h-[74px] shrink-0 items-center justify-between gap-3 border-b-2 border-line bg-surface px-4 py-3 md:h-[74px] md:gap-5 md:px-6 md:py-0">
                <div className="flex min-w-0 items-center gap-3 md:gap-4">
                    <span className="hidden font-display text-lg tracking-[0.14em] text-magenta sm:inline">
                        CONTROL
                    </span>
                    <span
                        className="hidden h-6 w-0.5 bg-line sm:block"
                        aria-hidden
                    />
                    {tournament ? (
                        <label className="flex min-w-0 items-center gap-2.5 border-2 border-line-strong bg-bg px-3.5 py-1">
                            <span className="sr-only">Turnier wechseln</span>
                            <select
                                value={tournament.id}
                                onChange={(e) =>
                                    selectTournament(e.target.value)
                                }
                                className="min-w-0 cursor-pointer truncate bg-bg py-1 text-[15px] font-semibold text-ink outline-none"
                            >
                                {tournaments.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title}
                                    </option>
                                ))}
                            </select>
                            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-ink-mute sm:inline">
                                {tournament.mode === 'team'
                                    ? 'Teamturnier'
                                    : 'Einzelturnier'}
                            </span>
                        </label>
                    ) : (
                        <span className="text-sm text-ink-mute">
                            Kein Turnier angelegt
                        </span>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {me && (
                        <span className="hidden text-sm text-ink-mute md:inline">
                            {me.displayName || me.email}
                        </span>
                    )}
                    <button
                        type="button"
                        title="Abmelden"
                        aria-label="Abmelden"
                        onClick={handleLogout}
                        disabled={logout.isPending}
                        className="cursor-pointer text-gold transition-colors hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <IoLogOutOutline size={32} />
                    </button>
                </div>
            </header>

            <nav
                ref={navRef}
                className="flex h-[54px] shrink-0 items-stretch overflow-x-auto border-b-2 border-line bg-bg px-2 [scrollbar-width:none] md:px-6"
            >
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.end}
                        className={({ isActive }) =>
                            `flex shrink-0 items-center border-b-4 px-3.5 font-display text-[13px] tracking-[0.1em] transition-colors md:px-5.5 ${
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

            <main className="min-h-0 grow p-4 md:p-6">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
