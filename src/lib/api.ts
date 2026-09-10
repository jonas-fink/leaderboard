import { z } from 'zod';
import { getToken, setToken, clearToken } from './auth';
import {
    TournamentSchema,
    TeamSchema,
    AuthTokenSchema,
    UploadResultSchema,
    GameSchema,
    PlayerSchema,
    PlayerStatsSchema,
    LeaderboardChartDataSchema,
    ScoreRecordSchema,
    BoardStateSchema,
    type CreateGameInput,
    type UpdateGameInput,
    type CreatePlayerInput,
    type UpdatePlayerInput,
    type SubmitScoreInput,
    type LoginInput,
    type CreateTournamentInput,
    type UpdateTournamentInput,
    type CreateTeamInput,
    type UpdateTeamInput,
} from '../schemas';

const BASE = '/api';

/** Fehlermeldung des Servers durchreichen statt "Failed to fetch". */
const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
): Promise<T> => {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            // Beim Upload setzt nur der Browser den Multipart-Boundary
            // richtig — ein eigener Content-Type macht ihn kaputt.
            ...(init?.body instanceof FormData
                ? {}
                : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
    });

    // Nur ein mitgeschicktes Token kann abgelaufen sein; ein 401 ohne Token
    // ist die normale Antwort auf "nicht angemeldet" und behält ihren Text.
    if (res.status === 401 && token) {
        clearToken();
        throw new Error('Sitzung abgelaufen — bitte PIN erneut eingeben');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `${res.status} ${res.statusText}`);
    }

    if (res.status === 204) return schema.parse(undefined);
    return schema.parse(await res.json());
};

const body = (data: unknown) => ({ body: JSON.stringify(data) });
const voidSchema = z.undefined();

// --- Anmeldung und Upload ------------------------------------------------

/** Tauscht den PIN gegen ein Token und merkt es sich. */
export const login = async (input: LoginInput) => {
    const { token } = await request('/auth', AuthTokenSchema, {
        method: 'POST',
        ...body(input),
    });
    setToken(token);
};

/** Lädt ein Bild hoch und gibt die Adresse zurück, die ins Feld wandert. */
export const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { url } = await request('/uploads', UploadResultSchema, {
        method: 'POST',
        body: form,
    });
    return url;
};

// --- Board ---------------------------------------------------------------

/**
 * Der vollständige Board-Zustand. Die einzige Leseroute ohne Token — der
 * Rechner an der Leinwand kann sich nicht anmelden (PROJEKT.md §9).
 */
export const fetchBoard = (slug: string, allGames = false) =>
    request(`/board/${slug}${allGames ? '?all=1' : ''}`, BoardStateSchema);

// --- Turniere ------------------------------------------------------------

export const fetchTournaments = () =>
    request('/tournaments', TournamentSchema.array());

export const createTournament = (input: CreateTournamentInput) =>
    request('/tournaments', TournamentSchema, {
        method: 'POST',
        ...body(input),
    });

export const updateTournament = (id: string, patch: UpdateTournamentInput) =>
    request(`/tournaments/${id}`, TournamentSchema, {
        method: 'PATCH',
        ...body(patch),
    });

// --- Teams ---------------------------------------------------------------

/** Eine turnierübergreifende Teamliste hat keine Bedeutung — siehe §3. */
export const fetchTeams = (tournamentId: string) =>
    request(`/teams?tournamentId=${tournamentId}`, TeamSchema.array());

export const createTeam = (input: CreateTeamInput) =>
    request('/teams', TeamSchema, { method: 'POST', ...body(input) });

export const updateTeam = (id: string, patch: UpdateTeamInput) =>
    request(`/teams/${id}`, TeamSchema, { method: 'PATCH', ...body(patch) });

export const deleteTeam = (id: string) =>
    request(`/teams/${id}`, voidSchema, { method: 'DELETE' });

// --- Games ---------------------------------------------------------------

export const fetchGames = () => request('/games', GameSchema.array());

export const createGame = (input: CreateGameInput) =>
    request('/games', GameSchema, { method: 'POST', ...body(input) });

export const updateGame = (id: string, patch: UpdateGameInput) =>
    request(`/games/${id}`, GameSchema, { method: 'PATCH', ...body(patch) });

export const deleteGame = (id: string) =>
    request(`/games/${id}`, voidSchema, { method: 'DELETE' });

// --- Players -------------------------------------------------------------

export const fetchPlayers = () => request('/players', PlayerSchema.array());

export const fetchPlayerStats = (id: string) =>
    request(`/players/${id}/stats`, PlayerStatsSchema);

export const createPlayer = (input: CreatePlayerInput) =>
    request('/players', PlayerSchema, { method: 'POST', ...body(input) });

export const updatePlayer = (id: string, patch: UpdatePlayerInput) =>
    request(`/players/${id}`, PlayerSchema, {
        method: 'PATCH',
        ...body(patch),
    });

export const deletePlayer = (id: string) =>
    request(`/players/${id}`, voidSchema, { method: 'DELETE' });

// --- Leaderboard ---------------------------------------------------------

export const fetchLeaderboards = () =>
    request('/leaderboard', LeaderboardChartDataSchema.array());

export const fetchLeaderboard = (slug: string) =>
    request(`/leaderboard/${slug}`, LeaderboardChartDataSchema);

// --- Scores --------------------------------------------------------------

/** Die letzten Eintragungen eines Turniers, zum Nachsehen und Zurücknehmen. */
export const fetchScores = (tournamentId: string, limit = 15) =>
    request(
        `/scores?tournamentId=${tournamentId}&limit=${limit}`,
        ScoreRecordSchema.array(),
    );

export const submitScore = (input: SubmitScoreInput) =>
    request('/scores', ScoreRecordSchema, { method: 'POST', ...body(input) });

export const deleteScore = (id: string) =>
    request(`/scores/${id}`, voidSchema, { method: 'DELETE' });
