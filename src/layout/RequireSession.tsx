import { Navigate, Outlet } from 'react-router';
import { useMe } from '../hooks';

/**
 * Wächter vor `/control` (specs/002, AC-2.8). `useMe()` **ist** der Cache —
 * kein Auth-Context, der dieselbe Wahrheit ein zweites Mal hielte. Während
 * des Ladens erscheint bewusst nichts, sonst würde die Kontrolle für einen
 * Moment aufblitzen, bevor die Umleitung greift.
 */
const RequireSession = () => {
    const { data: me, isLoading, isError } = useMe();

    if (isLoading) return null;
    if (isError || !me) return <Navigate to="/login" replace />;

    return <Outlet />;
};

export default RequireSession;
