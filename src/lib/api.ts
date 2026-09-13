import { z } from 'zod';
import {
    TournamentSchema,
    TeamSchema,
    UploadResultSchema,
    GameSchema,
    PlayerSchema,
    PlayerStatsSchema,
    LeaderboardChartDataSchema,
    ScoreRecordSchema,
    BoardStateSchema,
    MatchSchema,
    UserSchema,
    type CreateGameInput,
    type UpdateGameInput,
    type CreatePlayerInput,
    type UpdatePlayerInput,
    type SubmitScoreInput,
    type SubmitMatchInput,
    type LoginInput,
    type RegisterInput,
    type CreateTournamentInput,
    type UpdateTournamentInput,
    type CreateTeamInput,
    type UpdateTeamInput,
} from '../schemas';

const BASE = '/api';

/**
 * Ein Fehler der API. `fieldErrors` entsteht aus den `issues` einer
 * Zod-Validierung (400) oder aus dem ersten Schlüssel eines Duplicate-Key-
 * Fehlers (409) — beides übersetzt `toFieldErrors`. Ohne Zuordnung bleibt es
 * `undefined`, dann ist der Fehler nur global anzuzeigen (§FE-2).
 */
export class ApiError extends Error {
    readonly status: number;
    readonly fieldErrors?: Record<string, string>;

    constructor(
        message: string,
        status: number,
        fieldErrors?: Record<string, string>,
    ) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

type ErrorBody = {
    message?: string;
    issues?: { path: (string | number)[]; message: string }[];
    keys?: Record<string, unknown>;
};

/** Bildet die Fehlerantwort der `errorHandler`-Middleware auf Feldnamen ab. */
const toFieldErrors = (body: ErrorBody): Record<string, string> | undefined => {
    if (Array.isArray(body.issues)) {
        return Object.fromEntries(
            body.issues.map((issue) => [issue.path.join('.'), issue.message]),
        );
    }
    // 409 Duplicate-Key: nur der Feldname ist bekannt, keine eigene Meldung —
    // "bereits vergeben" gilt für E-Mail wie für Slug gleichermaßen.
    const [field] = Object.keys(body.keys ?? {});
    return field ? { [field]: 'Bereits vergeben' } : undefined;
};

/** Fehlermeldung des Servers durchreichen statt "Failed to fetch". */
const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
): Promise<T> => {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        // Same-Origin genügt (AD-1): die Anwendung liefert sich selbst aus,
        // das Sitzungs-Cookie verwaltet allein der Browser.
        credentials: 'same-origin',
        headers: {
            // Beim Upload setzt nur der Browser den Multipart-Boundary
            // richtig — ein eigener Content-Type macht ihn kaputt.
            ...(init?.body instanceof FormData
                ? {}
                : { 'Content-Type': 'application/json' }),
            ...init?.headers,
        },
    });

    if (!res.ok) {
        const body: ErrorBody | null = await res.json().catch(() => null);
        const message =
            res.status === 401
                ? 'Sitzung abgelaufen — bitte erneut anmelden'
                : (body?.message ?? `${res.status} ${res.statusText}`);
        throw new ApiError(
            message,
            res.status,
            body ? toFieldErrors(body) : undefined,
        );
    }

    if (res.status === 204) return schema.parse(undefined);
    return schema.parse(await res.json());
};

const body = (data: unknown) => ({ body: JSON.stringify(data) });
const voidSchema = z.undefined();

// --- Konto -----------------------------------------------------------------

export const register = (input: RegisterInput) =>
    request('/auth/register', UserSchema, {
        method: 'POST',
        ...body(input),
    });

export const login = (input: LoginInput) =>
    request('/auth/login', UserSchema, { method: 'POST', ...body(input) });

export const logout = () =>
    request('/auth/logout', voidSchema, { method: 'POST' });

export const fetchMe = () => request('/auth/me', UserSchema);

// --- Upload ------------------------------------------------------------------

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
 * Der vollständige Board-Zustand. Die einzige Leseroute ohne Sitzung — der
 * Rechner an der Leinwand kann sich nicht anmelden (specs/002, AC-4.1).
 */
export const fetchBoard = (
    userSlug: string,
    tournamentSlug: string,
    allGames = false,
) =>
    request(
        `/board/${userSlug}/${tournamentSlug}${allGames ? '?all=1' : ''}`,
        BoardStateSchema,
    );

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

/** Games gibt es nur turnierbezogen (specs/002, BE-8) — ohne `tournamentId`
 *  antwortet der Server 400. */
export const fetchGames = (tournamentId: string) =>
    request(`/games?tournamentId=${tournamentId}`, GameSchema.array());

export const createGame = (input: CreateGameInput) =>
    request('/games', GameSchema, { method: 'POST', ...body(input) });

export const updateGame = (id: string, patch: UpdateGameInput) =>
    request(`/games/${id}`, GameSchema, { method: 'PATCH', ...body(patch) });

export const deleteGame = (id: string) =>
    request(`/games/${id}`, voidSchema, { method: 'DELETE' });

// --- Players -------------------------------------------------------------

/** Spieler gehören dem Konto, nicht dem Turnier (AD-8) — keine `tournamentId`
 *  nötig, der Server filtert bereits auf `ownerId`. */
export const fetchPlayers = () => request('/players', PlayerSchema.array());

export const fetchPlayerStats = (id: string, tournamentId: string) =>
    request(
        `/players/${id}/stats?tournamentId=${tournamentId}`,
        PlayerStatsSchema,
    );

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

export const fetchLeaderboards = (tournamentId: string) =>
    request(
        `/leaderboard?tournamentId=${tournamentId}`,
        LeaderboardChartDataSchema.array(),
    );

export const fetchLeaderboard = (slug: string, tournamentId: string) =>
    request(
        `/leaderboard/${slug}?tournamentId=${tournamentId}`,
        LeaderboardChartDataSchema,
    );

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

// --- Matches (Versus-Disziplinen) -----------------------------------------

/** Matches gibt es nur je Disziplin — ohne gameId liefert die Route 400. */
export const fetchMatches = (gameId: string) =>
    request(`/matches?gameId=${gameId}`, MatchSchema.array());

export const createMatch = (input: SubmitMatchInput) =>
    request('/matches', MatchSchema, { method: 'POST', ...body(input) });

export const deleteMatch = (id: string) =>
    request(`/matches/${id}`, voidSchema, { method: 'DELETE' });
