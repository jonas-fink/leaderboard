import { Outlet } from 'react-router';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen antialiased">
            <div className="sticky bottom-0 z-10"></div>
            <div className="flex justify-center items-center p-8 gap-8">
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
