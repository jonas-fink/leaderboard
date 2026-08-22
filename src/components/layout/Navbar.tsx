import { Link, NavLink } from 'react-router';
import { IoGameControllerOutline, IoPersonOutline } from 'react-icons/io5';

const Navbar = () => {
    return (
        <nav className="flex items-center border-b border-line backdrop-blur-md bg-linear-to-br from-header-hextech via-runeterra-sapphire to-midnight-cobal p-3">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-center px-4">
                {/* Link statt <a>: sonst lädt das Logo die ganze App neu. */}
                <Link to="/" className="group flex items-center gap-3">
                    <span
                        className="h-px w-8 bg-line-strong sm:w-14"
                        aria-hidden
                    />
                    <span className="wordmark text-xl sm:text-2xl md:text-5xl">
                        Leaderboard
                    </span>
                    <span
                        className="h-px w-8 bg-line-strong sm:w-14"
                        aria-hidden
                    />
                </Link>
            </div>
            <div className="flex items-center gap-4 relative md:right-32 ">
                <NavLink
                    to="/games"
                    className=" hover:-translate-y-0.5 text-logo"
                >
                    <IoGameControllerOutline size={32} />
                </NavLink>
                <NavLink
                    to="/players"
                    className="hover:-translate-y-0.5 text-logo"
                >
                    <IoPersonOutline size={32} />
                </NavLink>
            </div>
        </nav>
    );
};

export default Navbar;
