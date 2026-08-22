import { Route, Routes } from 'react-router';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';

const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
            </Route>
        </Routes>
    );
};

export default App;
