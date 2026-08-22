import { LeaderChartCard } from '../components/LeaderChartCard';
import {
    LeaderboardChartDataSchema,
    type LeaderboardChartData,
} from '../schemas';

const CURRENT_USER_ID = 'p-john';

const games: LeaderboardChartData[] = [
    {
        game: {
            id: 'g-rocket-league',
            slug: 'rocket-league',
            title: 'Rocket League',
            coverUrl: 'https://picsum.photos/seed/rocket-league/640/240',
            genre: 'sports',
            primaryMetric: {
                key: 'goals',
                label: 'Tore',
                sortOrder: 'DESC',
                formatter: 'integer',
            },
            secondaryMetrics: [
                {
                    key: 'assists',
                    label: 'Vorlagen',
                    sortOrder: 'DESC',
                    formatter: 'integer',
                },
            ],
        },
        timeframe: 'monthly',
        totalParticipants: 42,
        topEntries: [
            {
                id: 'e-rl-1',
                gameId: 'g-rocket-league',
                player: { id: 'p-alice', username: 'Alice', countryCode: 'DE' },
                primaryValue: 15,
                secondaryValues: { assists: 9 },
                rank: 1,
                recordedAt: '2026-08-18T20:14:00.000Z',
            },
            {
                id: 'e-rl-2',
                gameId: 'g-rocket-league',
                player: { id: 'p-bob', username: 'Bob', countryCode: 'AT' },
                primaryValue: 13,
                secondaryValues: { assists: 4 },
                rank: 2,
                recordedAt: '2026-08-19T18:02:00.000Z',
            },
            {
                id: 'e-rl-3',
                gameId: 'g-rocket-league',
                player: { id: 'p-john', username: 'John', countryCode: 'DE' },
                primaryValue: 12,
                secondaryValues: { assists: 7 },
                rank: 3,
                recordedAt: '2026-08-20T21:37:00.000Z',
            },
            {
                id: 'e-rl-4',
                gameId: 'g-rocket-league',
                player: { id: 'p-mira', username: 'Mira', countryCode: 'CH' },
                primaryValue: 10,
                rank: 4,
                recordedAt: '2026-08-21T17:45:00.000Z',
            },
            {
                id: 'e-rl-5',
                gameId: 'g-rocket-league',
                player: { id: 'p-tarek', username: 'Tarek', countryCode: 'DE' },
                primaryValue: 8,
                rank: 5,
                recordedAt: '2026-08-21T19:10:00.000Z',
            },
        ],
    },
    {
        game: {
            id: 'g-mario-kart',
            slug: 'mario-kart-8',
            title: 'Mario Kart 8',
            coverUrl: 'https://picsum.photos/seed/mario-kart/640/240',
            genre: 'racing',
            primaryMetric: {
                key: 'best_lap',
                label: 'Beste Runde',
                sortOrder: 'ASC',
                formatter: 'time_ms',
            },
        },
        timeframe: 'weekly',
        totalParticipants: 27,
        topEntries: [
            {
                id: 'e-mk-1',
                gameId: 'g-mario-kart',
                player: { id: 'p-mira', username: 'Mira', countryCode: 'CH' },
                primaryValue: 92450,
                rank: 1,
                recordedAt: '2026-08-17T12:00:00.000Z',
            },
            {
                id: 'e-mk-2',
                gameId: 'g-mario-kart',
                player: { id: 'p-alice', username: 'Alice', countryCode: 'DE' },
                primaryValue: 94120,
                rank: 2,
                recordedAt: '2026-08-18T09:22:00.000Z',
            },
            {
                id: 'e-mk-3',
                gameId: 'g-mario-kart',
                player: { id: 'p-bob', username: 'Bob', countryCode: 'AT' },
                primaryValue: 97880,
                rank: 3,
                recordedAt: '2026-08-19T15:41:00.000Z',
            },
            {
                id: 'e-mk-4',
                gameId: 'g-mario-kart',
                player: { id: 'p-tarek', username: 'Tarek', countryCode: 'DE' },
                primaryValue: 101300,
                rank: 4,
                recordedAt: '2026-08-20T11:05:00.000Z',
            },
            {
                id: 'e-mk-5',
                gameId: 'g-mario-kart',
                player: { id: 'p-lena', username: 'Lena', countryCode: 'DE' },
                primaryValue: 103975,
                rank: 5,
                recordedAt: '2026-08-21T08:30:00.000Z',
            },
        ],
        userEntry: {
            id: 'e-mk-9',
            gameId: 'g-mario-kart',
            player: { id: 'p-john', username: 'John', countryCode: 'DE' },
            primaryValue: 118640,
            rank: 9,
            recordedAt: '2026-08-21T22:12:00.000Z',
        },
    },
    {
        game: {
            id: 'g-counter-strike',
            slug: 'counter-strike-2',
            title: 'Counter-Strike 2',
            coverUrl: 'https://picsum.photos/seed/counter-strike/640/240',
            genre: 'fps',
            primaryMetric: {
                key: 'kd_ratio',
                label: 'K/D',
                sortOrder: 'DESC',
                formatter: 'decimal',
            },
        },
        timeframe: 'season',
        totalParticipants: 64,
        topEntries: [
            {
                id: 'e-cs-1',
                gameId: 'g-counter-strike',
                player: { id: 'p-tarek', username: 'Tarek', countryCode: 'DE' },
                primaryValue: 2.14,
                rank: 1,
                recordedAt: '2026-08-15T20:00:00.000Z',
            },
            {
                id: 'e-cs-2',
                gameId: 'g-counter-strike',
                player: { id: 'p-john', username: 'John', countryCode: 'DE' },
                primaryValue: 1.87,
                rank: 2,
                recordedAt: '2026-08-16T21:30:00.000Z',
            },
            {
                id: 'e-cs-3',
                gameId: 'g-counter-strike',
                player: { id: 'p-lena', username: 'Lena', countryCode: 'DE' },
                primaryValue: 1.62,
                rank: 3,
                recordedAt: '2026-08-18T19:15:00.000Z',
            },
            {
                id: 'e-cs-4',
                gameId: 'g-counter-strike',
                player: { id: 'p-bob', username: 'Bob', countryCode: 'AT' },
                primaryValue: 1.35,
                rank: 4,
                recordedAt: '2026-08-20T22:48:00.000Z',
            },
            {
                id: 'e-cs-5',
                gameId: 'g-counter-strike',
                player: { id: 'p-mira', username: 'Mira', countryCode: 'CH' },
                primaryValue: 1.09,
                rank: 5,
                recordedAt: '2026-08-21T20:05:00.000Z',
            },
        ],
    },
];

// Drop this line once a real API supplies the data.
LeaderboardChartDataSchema.array().parse(games);

const Dashboard = () => {
    return (
        <div className="flex flex-wrap gap-8">
            {games.map((data) => (
                <LeaderChartCard
                    key={data.game.id}
                    data={data}
                    currentUserId={CURRENT_USER_ID}
                    onViewAll={(slug) => console.log('view all:', slug)}
                />
            ))}
        </div>
    );
};

export default Dashboard;
