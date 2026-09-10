import { Navigate, Route, Routes } from 'react-router';
import Layout from './layout/Layout';
import Scoring from './pages/Scoring';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Tournament from './pages/Tournament';
import Board from './pages/Board';
import Result from './pages/Result';

/**
 * Drei Oberflächen mit verschiedenen Zielgeräten (PROJEKT.md §2). `/control`
 * ist die Eingabe auf dem Tablet; `/board` und `/result` laufen ohne diesen
 * Rahmen, weil auf der Leinwand keine Navigation steht.
 */
const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/control" replace />} />
            <Route path="/board/:tournamentSlug" element={<Board />} />
            <Route path="/result/:tournamentSlug" element={<Result />} />
            <Route path="/control" element={<Layout />}>
                <Route index element={<Scoring />} />
                <Route path="games" element={<Games />} />
                <Route path="games/:slug" element={<GameDetail />} />
                <Route path="players" element={<Players />} />
                <Route path="teams" element={<Teams />} />
                <Route path="tournament" element={<Tournament />} />
            </Route>
        </Routes>
    );
};

export default App;
