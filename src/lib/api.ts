import { z } from 'zod';
import { getToken, setToken, clearToken } from './auth';
import {
    TournamentSchema,
    AuthTokenSchema,
    UploadResultSchema,
    GameSchema,
    PlayerSchema,
    PlayerStatsSchema,
    LeaderboardChartDataSchema,
    ScoreRecordSchema,
    type CreateGameInput,
    type UpdateGameInput,
    type CreatePlayerInput,
    type UpdatePlayerInput,
    type SubmitScoreInput,
    type LoginInput,
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

// --- Turniere ------------------------------------------------------------

export const fetchTournaments = () =>
    request('/tournaments', TournamentSchema.array());

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

export const submitScore = (input: SubmitScoreInput) =>
    request('/scores', ScoreRecordSchema, { method: 'POST', ...body(input) });

export const deleteScore = (id: string) =>
    request(`/scores/${id}`, voidSchema, { method: 'DELETE' });
