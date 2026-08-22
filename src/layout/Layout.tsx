import { Outlet } from 'react-router';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen antialiased">
            <div className="sticky bottom-0 z-10"></div>
            <div className="mx-auto w-full max-w-7xl md:p-8">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
