import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { announce } from '#services/announce';
import { boardById } from '#services/board.service';
import { announcementPool, createPicker } from '#content';
import {
    BoardStateSchema,
    AnnouncementSchema,
    RoomJoinSchema,
    TournamentStatusEventSchema,
} from '#schemas';
import { z } from 'zod';
import type {
    BoardState,
    ClientToServerEvents,
    ServerToClientEvents,
    TournamentStatus,
} from '#types';

/**
 * Die einzige Stelle im Code, an der emittiert wird (KONVENTIONEN §8).
 * Controller und Services rufen `emitBoardUpdate(tournamentId)` auf und
 * bleiben damit unabhängig von einer laufenden Socket-Instanz.
 */
let io: Server<ClientToServerEvents, ServerToClientEvents> | undefined;

/** Ein Raum je Turnier — Board und Control-Panel treten beim Laden bei. */
const room = (tournamentId: string) => `tournament:${tournamentId}`;

/**
 * Der zuletzt gesendete Zustand je Turnier. `announce` vergleicht damit zwei
 * aufeinanderfolgende Board-Zustände; vor dem ersten Emit gibt es nichts zu
 * vergleichen und es kommen keine Toasts.
 *
 * ponytail: im Prozessspeicher. Ein Neustart mitten im Event kostet die
 * Toasts des nächsten Scores, nicht die Wertung — die wird ohnehin bei jedem
 * Abruf neu gerechnet. Persistenz erst, wenn mehrere Instanzen laufen.
 */
const lastState = new Map<string, BoardState>();

const pick = createPicker();

const AnnouncementsSchema = z.array(AnnouncementSchema);

export const initRealtime = (httpServer: HttpServer): void => {
    io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

    io.on('connection', (socket) => {
        socket.on('room:join', (payload) => {
            // Auch eine Socket-Nachricht geht durch den Vertrag (§8).
            const parsed = RoomJoinSchema.safeParse(payload);
            if (!parsed.success) return;
            void socket.join(room(parsed.data.tournamentId));
        });
    });
};

/**
 * Rechnet das Board neu, verteilt es vollständig (§5) und schickt die
 * Ereignisse hinterher, die der Vergleich mit dem vorherigen Zustand ergibt.
 *
 * Ohne initialisierten Socket — etwa in einem Skript — passiert nichts.
 */
export const emitBoardUpdate = async (tournamentId: string): Promise<void> => {
    if (!io) return;

    const next = await boardById(tournamentId);
    const events = announce(
        lastState.get(tournamentId),
        next,
        announcementPool,
        pick,
    );
    lastState.set(tournamentId, next);

    const target = io.to(room(tournamentId));
    target.emit('board:update', BoardStateSchema.parse(next));
    if (events.length > 0) {
        target.emit('event:announce', AnnouncementsSchema.parse(events));
    }
};

/** Wechsel auf `finished` löst auf dem Board die Siegerehrung aus (§5). */
export const emitTournamentStatus = (
    tournamentId: string,
    status: TournamentStatus,
): void => {
    io?.to(room(tournamentId)).emit(
        'tournament:status',
        TournamentStatusEventSchema.parse({ tournamentId, status }),
    );
};
