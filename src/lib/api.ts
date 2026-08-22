import { z } from 'zod';
import {
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
} from '../schemas';

const BASE = '/api';

/** Fehlermeldung des Servers durchreichen statt "Failed to fetch". */
const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `${res.status} ${res.statusText}`);
    }

    if (res.status === 204) return schema.parse(undefined);
    return schema.parse(await res.json());
};

const body = (data: unknown) => ({ body: JSON.stringify(data) });
const voidSchema = z.undefined();

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
