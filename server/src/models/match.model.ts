import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const matchSideSchema = new Schema(
    {
        playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
        value: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const matchSchema = new Schema(
    {
        // Denormalisiert vom Game, damit Turnierabfragen ohne Join auskommen —
        // dieselbe Begründung wie bei Score.
        tournamentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true,
        },
        gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
        entrantType: { type: String, enum: ['player', 'team'], required: true },
        sides: { type: [matchSideSchema], required: true },
        playedAt: { type: Date, default: Date.now },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

/** Nur die Felder, die der Validator liest. */
type MatchSideRefs = {
    playerId?: unknown;
    teamId?: unknown;
};

type MatchRefs = {
    entrantType: string;
    sides?: MatchSideRefs[];
};

/**
 * Drei Regeln, wie in architecture.md beschrieben:
 * genau zwei Seiten, je Seite genau die zu `entrantType` passende ID, und
 * die beiden Teilnehmer sind verschieden.
 *
 * `function` statt Arrow, weil der Hook das Dokument über `this` bekommt —
 * dieselbe Ausnahme wie in score.model.ts.
 */
matchSchema.pre('validate', function () {
    const match = this as unknown as MatchRefs;
    const sides = match.sides ?? [];

    if (sides.length !== 2) {
        throw new Error('Ein Match hat genau zwei Seiten');
    }

    const passt = (side: MatchSideRefs) =>
        match.entrantType === 'player'
            ? side.playerId != null && side.teamId == null
            : side.teamId != null && side.playerId == null;

    if (!sides.every(passt)) {
        throw new Error(
            'Zu entrantType gehört je Seite genau eine ID: playerId oder teamId',
        );
    }

    const [first, second] = sides;
    const idOf = (side: MatchSideRefs) =>
        String(match.entrantType === 'player' ? side.playerId : side.teamId);
    if (idOf(first!) === idOf(second!)) {
        throw new Error(
            'Die beiden Seiten müssen unterschiedliche Teilnehmer sein',
        );
    }
});

// Deckt die Tabelle je Disziplin (alle Matches eines Games) und den
// Live-Feed des Turniers (neueste zuerst) ab.
matchSchema.index({ gameId: 1, playedAt: -1 });
matchSchema.index({ tournamentId: 1, playedAt: -1 });

export const Match = model('Match', matchSchema);
