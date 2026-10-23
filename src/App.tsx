import { Navigate, Route, Routes } from 'react-router';
import Layout from './layout/Layout';
import RequireSession from './layout/RequireSession';
import Scoring from './pages/Scoring';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Tournament from './pages/Tournament';
import Board from './pages/Board';
import Result from './pages/Result';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Confirm from './pages/Confirm';
import Account from './pages/Account';

/**
 * Drei Oberflächen mit verschiedenen Zielgeräten (PROJEKT.md §2). `/control`
 * ist die Eingabe auf dem Tablet, hinter `RequireSession` (specs/002,
 * AC-2.8); `/board` und `/result` laufen ohne diesen Rahmen und ohne
 * Sitzung (AC-4.4) — auf der Leinwand steht weder Navigation noch Anmeldung.
 */
const App = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/control" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm" element={<Confirm />} />
            <Route path="/board/:userSlug/:slug" element={<Board />} />
            <Route path="/result/:userSlug/:slug" element={<Result />} />
            <Route path="/control" element={<RequireSession />}>
                <Route element={<Layout />}>
                    <Route index element={<Scoring />} />
                    <Route path="games" element={<Games />} />
                    <Route path="games/:slug" element={<GameDetail />} />
                    <Route path="players" element={<Players />} />
                    <Route path="teams" element={<Teams />} />
                    <Route path="tournament" element={<Tournament />} />
                    <Route path="account" element={<Account />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default App;
