import { MdOutlineAdd } from 'react-icons/md';
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
            coverUrl:
                'https://www.nintendo.com/eu/media/images/10_share_images/games_15/nintendo_switch_download_software_1/2x1_NSwitchDS_RocketLeague_S16.jpg',
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
            coverUrl:
                'https://www.nintendo.com/eu/media/images/08_content_images/games_6/nintendo_switch_7/nswitch_mariokart8deluxe/booster_hero_img.jpg',
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
];

// Drop this line once a real API supplies the data.
LeaderboardChartDataSchema.array().parse(games);

const Dashboard = () => {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-8">
            {games.map((data) => (
                <LeaderChartCard
                    key={data.game.id}
                    data={data}
                    currentUserId={CURRENT_USER_ID}
                    onViewAll={(slug) => console.log('view all:', slug)}
                />
            ))}
            <button className="flex justify-center items-center max-w-3xl p-8 text-ink-mute border-2 border-dashed border-ink-mute rounded-xl hover:-translate-y-1 cursor-pointer hover:text-ink">
                <MdOutlineAdd size={48} />
            </button>
        </div>
    );
};

export default Dashboard;
