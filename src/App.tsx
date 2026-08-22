import { Route, Routes } from 'react-router';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Players from './pages/Players';

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="games" element={<Games />} />
                <Route path="players" element={<Players />} />
            </Route>
        </Routes>
    );
};

export default App;
