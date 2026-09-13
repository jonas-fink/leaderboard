import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type {
    CreateGameInput,
    UpdateGameInput,
    CreatePlayerInput,
    UpdatePlayerInput,
    SubmitScoreInput,
    SubmitMatchInput,
    CreateTournamentInput,
    UpdateTournamentInput,
    CreateTeamInput,
    UpdateTeamInput,
    LoginInput,
    RegisterInput,
} from '../schemas';

export const queryKeys = {
    me: ['me'] as const,
    tournaments: ['tournaments'] as const,
    games: (tournamentId: string) => ['games', tournamentId] as const,
    players: ['players'] as const,
    leaderboards: (tournamentId: string) =>
        ['leaderboard', tournamentId] as const,
    leaderboard: (slug: string, tournamentId: string) =>
        ['leaderboard', tournamentId, slug] as const,
    // Ungebundener Präfix zum Invalidieren, wenn die betroffene tournamentId
    // beim Aufrufer nicht bekannt ist (Spieler gehören dem Konto, nicht
    // einem Turnier — anders als bei Games oben).
    leaderboardsAll: ['leaderboard'] as const,
    playerStats: (id: string, tournamentId: string) =>
        ['player-stats', id, tournamentId] as const,
    playerStatsAll: (id: string) => ['player-stats', id] as const,
    /** Wie `leaderboardsAll`, nur für die Spielerstatistik: im Team-Modus
     *  gilt ein Ergebnis für jedes Mitglied, nicht für einen Spieler. */
    playerStatsEvery: ['player-stats'] as const,
    board: (userSlug: string, slug: string, allGames: boolean) =>
        ['board', userSlug, slug, allGames] as const,
    teams: (tournamentId: string) => ['teams', tournamentId] as const,
    scores: (tournamentId: string) => ['scores', tournamentId] as const,
    matches: (gameId: string) => ['matches', gameId] as const,
};

// --- Konto -----------------------------------------------------------------

/** `retry: false`, sonst hängt `RequireSession` auf einer 401 erst die
 *  Standard-Wiederholung ab, bevor sie auf `/login` umleiten kann. */
export const useMe = () =>
    useQuery({ queryKey: queryKeys.me, queryFn: api.fetchMe, retry: false });

export const useLogin = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: LoginInput) => api.login(input),
        // Die Antwort ist bereits der neue Zustand — kein zweiter Roundtrip.
        onSuccess: (user) => qc.setQueryData(queryKeys.me, user),
    });
};

export const useRegister = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: RegisterInput) => api.register(input),
        onSuccess: (user) => qc.setQueryData(queryKeys.me, user),
    });
};

export const useLogout = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.logout(),
        // Der gesamte Cache gehört dem abgemeldeten Konto — ein gezieltes
        // Invalidieren würde nur das nächste Konto mit fremden Daten starten.
        onSuccess: () => qc.clear(),
    });
};

// --- Queries -------------------------------------------------------------

export const useTournaments = () =>
    useQuery({
        queryKey: queryKeys.tournaments,
        queryFn: api.fetchTournaments,
    });

/** Games gibt es nur turnierbezogen (specs/002, BE-8). */
export const useGames = (tournamentId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.games(tournamentId ?? ''),
        queryFn: () => api.fetchGames(tournamentId!),
        enabled: Boolean(tournamentId),
    });

export const usePlayers = () =>
    useQuery({ queryKey: queryKeys.players, queryFn: api.fetchPlayers });

export const useLeaderboards = (tournamentId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.leaderboards(tournamentId ?? ''),
        queryFn: () => api.fetchLeaderboards(tournamentId!),
        enabled: Boolean(tournamentId),
    });

export const useLeaderboard = (
    slug: string,
    tournamentId: string | undefined,
) =>
    useQuery({
        queryKey: queryKeys.leaderboard(slug, tournamentId ?? ''),
        queryFn: () => api.fetchLeaderboard(slug, tournamentId!),
        enabled: Boolean(tournamentId),
    });

export const useTeams = (tournamentId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.teams(tournamentId ?? ''),
        queryFn: () => api.fetchTeams(tournamentId!),
        enabled: Boolean(tournamentId),
    });

export const useScores = (tournamentId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.scores(tournamentId ?? ''),
        queryFn: () => api.fetchScores(tournamentId!),
        enabled: Boolean(tournamentId),
    });

export const usePlayerStats = (
    id: string | null,
    tournamentId: string | undefined,
) =>
    useQuery({
        queryKey: queryKeys.playerStats(id ?? '', tournamentId ?? ''),
        queryFn: () => api.fetchPlayerStats(id!, tournamentId!),
        enabled: Boolean(id) && Boolean(tournamentId),
    });

export const useMatches = (gameId: string | undefined) =>
    useQuery({
        queryKey: queryKeys.matches(gameId ?? ''),
        queryFn: () => api.fetchMatches(gameId!),
        enabled: Boolean(gameId),
    });

// --- Mutations -----------------------------------------------------------

/**
 * Alle Mutationen invalidieren gezielt statt pauschal: ein Score-Submit
 * rührt nur das Leaderboard und die Stats des betroffenen Spielers an, die
 * Games- und Players-Listen bleiben aus dem Cache stehen.
 */
export const useCreateGame = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateGameInput) => api.createGame(input),
        onSuccess: (game) => {
            qc.invalidateQueries({ queryKey: queryKeys.games(game.tournamentId) });
        },
    });
};

export const useUpdateGame = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: UpdateGameInput }) =>
            api.updateGame(id, patch),
        onSuccess: (game) => {
            qc.invalidateQueries({ queryKey: queryKeys.games(game.tournamentId) });
            // pinned/Metrik-Änderungen verändern das Board.
            qc.invalidateQueries({
                queryKey: queryKeys.leaderboards(game.tournamentId),
            });
        },
    });
};

/** Wie `useDeleteTeam`: `DELETE` antwortet 204, die `tournamentId` kommt
 *  deshalb vom Aufrufer statt aus der Antwort. */
export const useDeleteGame = (tournamentId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteGame(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.games(tournamentId) });
            qc.invalidateQueries({
                queryKey: queryKeys.leaderboards(tournamentId),
            });
        },
    });
};

export const useCreatePlayer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreatePlayerInput) => api.createPlayer(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.players });
        },
    });
};

export const useUpdatePlayer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: UpdatePlayerInput }) =>
            api.updatePlayer(id, patch),
        onSuccess: (player) => {
            qc.invalidateQueries({ queryKey: queryKeys.players });
            qc.invalidateQueries({
                queryKey: queryKeys.playerStatsAll(player.id),
            });
            // Der Name steht auch in jeder Rangliste, in jedem Turnier.
            qc.invalidateQueries({ queryKey: queryKeys.leaderboardsAll });
        },
    });
};

export const useDeletePlayer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deletePlayer(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.players });
            qc.invalidateQueries({ queryKey: queryKeys.leaderboardsAll });
        },
    });
};

export const useSubmitScore = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: SubmitScoreInput) => api.submitScore(input),
        onSuccess: (_score, input) => {
            // Die Liste "Letzte Wertungen" auf /control liest aus dieser
            // Query — ohne sie stand dort bis zum nächsten Reload der alte
            // Stand.
            qc.invalidateQueries({
                queryKey: queryKeys.scores(input.tournamentId),
            });
            qc.invalidateQueries({
                queryKey: queryKeys.leaderboards(input.tournamentId),
            });
            // Präfix statt gezielt: im Team-Modus trägt der Score keine
            // playerId, die Medaillen des Teams gelten aber für jedes
            // Mitglied.
            qc.invalidateQueries({ queryKey: queryKeys.playerStatsEvery });
        },
    });
};

// --- Turnier und Team ----------------------------------------------------

export const useCreateTournament = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateTournamentInput) =>
            api.createTournament(input),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: queryKeys.tournaments }),
    });
};

export const useUpdateTournament = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            patch,
        }: {
            id: string;
            patch: UpdateTournamentInput;
        }) => api.updateTournament(id, patch),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: queryKeys.tournaments }),
    });
};

export const useCreateTeam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateTeamInput) => api.createTeam(input),
        onSuccess: (team) =>
            qc.invalidateQueries({
                queryKey: queryKeys.teams(team.tournamentId),
            }),
    });
};

export const useUpdateTeam = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: UpdateTeamInput }) =>
            api.updateTeam(id, patch),
        onSuccess: (team) =>
            qc.invalidateQueries({
                queryKey: queryKeys.teams(team.tournamentId),
            }),
    });
};

export const useDeleteTeam = (tournamentId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteTeam(id),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: queryKeys.teams(tournamentId) }),
    });
};

/** Eine zurückgenommene Wertung rührt die Liste und das Board an. */
export const useDeleteScore = (tournamentId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteScore(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.scores(tournamentId) });
            qc.invalidateQueries({
                queryKey: queryKeys.leaderboards(tournamentId),
            });
        },
    });
};

/**
 * Ein erfasstes Match rührt nur die Match-Liste seiner Disziplin an — das
 * Board selbst bekommt seinen neuen Zustand über `board:update` (§8), nicht
 * über einen zweiten Roundtrip aus diesem Tab.
 */
export const useCreateMatch = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: SubmitMatchInput) => api.createMatch(input),
        onSuccess: (match) => {
            qc.invalidateQueries({ queryKey: queryKeys.matches(match.gameId) });
            // Ein Match verschiebt Tabelle und Medaillen genauso wie ein
            // Score — nur das Board bekommt seinen Stand über den Socket.
            qc.invalidateQueries({
                queryKey: queryKeys.leaderboards(match.tournamentId),
            });
            qc.invalidateQueries({ queryKey: queryKeys.playerStatsEvery });
        },
    });
};

/** Wie `useDeleteScore`: `DELETE` antwortet 204, die gameId kommt deshalb vom
 * Aufrufer statt aus der Antwort. */
export const useDeleteMatch = (gameId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteMatch(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.matches(gameId) });
        },
    });
};
