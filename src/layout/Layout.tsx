import { Outlet } from 'react-router';
import Navbar from '../components/layout/Navbar';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen antialiased">
            <div className="sticky bottom-0 z-10">
                <Navbar />
            </div>
            <div className="mx-auto w-full max-w-7xl md:p-8">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
