import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type {
    CreateGameInput,
    UpdateGameInput,
    CreatePlayerInput,
    UpdatePlayerInput,
    SubmitScoreInput,
    CreateTournamentInput,
    UpdateTournamentInput,
    CreateTeamInput,
    UpdateTeamInput,
} from '../schemas';

export const queryKeys = {
    tournaments: ['tournaments'] as const,
    games: ['games'] as const,
    players: ['players'] as const,
    leaderboards: ['leaderboard'] as const,
    leaderboard: (slug: string) => ['leaderboard', slug] as const,
    playerStats: (id: string) => ['player-stats', id] as const,
    board: (slug: string, allGames: boolean) =>
        ['board', slug, allGames] as const,
    teams: (tournamentId: string) => ['teams', tournamentId] as const,
    scores: (tournamentId: string) => ['scores', tournamentId] as const,
};

// --- Queries -------------------------------------------------------------

export const useTournaments = () =>
    useQuery({
        queryKey: queryKeys.tournaments,
        queryFn: api.fetchTournaments,
    });

export const useGames = () =>
    useQuery({ queryKey: queryKeys.games, queryFn: api.fetchGames });

export const usePlayers = () =>
    useQuery({ queryKey: queryKeys.players, queryFn: api.fetchPlayers });

export const useLeaderboards = () =>
    useQuery({
        queryKey: queryKeys.leaderboards,
        queryFn: api.fetchLeaderboards,
    });

export const useLeaderboard = (slug: string) =>
    useQuery({
        queryKey: queryKeys.leaderboard(slug),
        queryFn: () => api.fetchLeaderboard(slug),
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

export const usePlayerStats = (id: string | null) =>
    useQuery({
        queryKey: queryKeys.playerStats(id ?? ''),
        queryFn: () => api.fetchPlayerStats(id!),
        enabled: Boolean(id),
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
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.games });
        },
    });
};

export const useUpdateGame = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: UpdateGameInput }) =>
            api.updateGame(id, patch),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.games });
            // pinned/Metrik-Änderungen verändern das Board. ['leaderboard']
            // trifft per Prefix auch ['leaderboard', slug].
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
        },
    });
};

export const useDeleteGame = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteGame(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.games });
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
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
                queryKey: queryKeys.playerStats(player.id),
            });
            // Der Name steht auch in jeder Rangliste.
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
        },
    });
};

export const useDeletePlayer = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deletePlayer(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.players });
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
        },
    });
};

export const useSubmitScore = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: SubmitScoreInput) => api.submitScore(input),
        onSuccess: (_score, input) => {
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
            // Team-Scores haben keine playerId — dann gibt es auch keine
            // Spielerstatistik, die veralten könnte.
            if (input.playerId) {
                qc.invalidateQueries({
                    queryKey: queryKeys.playerStats(input.playerId),
                });
            }
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
            qc.invalidateQueries({ queryKey: queryKeys.leaderboards });
        },
    });
};
