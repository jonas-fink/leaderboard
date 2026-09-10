import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';
import { queryKeys } from './index';
import { getSocket } from '../lib/socket';
import type { Announcement, BoardState } from '../schemas';

/** §5: Sicherheitsnetz, falls der Socket weg ist, ohne es zu merken. */
const POLL_MS = 30_000;
/** §7: Anzeigedauer eines Toasts, und wie viele gleichzeitig stehen. */
const TOAST_MS = 6_000;
const TOAST_SLOTS = 2;
/** Takt, in dem die Warteschlange nachrückt. Feiner als das Auge braucht. */
const TICK_MS = 250;

type ToastState = {
    /** Was noch wartet, in der Reihenfolge, in der es hereinkam. */
    queue: Announcement[];
    /** Was gerade steht, mit dem Zeitpunkt, an dem es verschwindet. */
    shown: { event: Announcement; until: number }[];
};

const EMPTY: ToastState = { queue: [], shown: [] };

/**
 * Abgelaufene Toasts fallen raus, freie Plätze werden aus der Warteschlange
 * gefüllt. Eine reine Funktion und ein Takt statt eines Timers je Toast:
 * Timer im Effect-Cleanup werden bei jeder Zustandsänderung abgeräumt und
 * ein Toast bliebe dann hängen.
 *
 * Ändert sich nichts, kommt derselbe Zustand zurück — React rendert dann
 * nicht neu, und der Takt kostet nichts.
 */
const pump = (state: ToastState, now: number): ToastState => {
    const shown = state.shown.filter((toast) => toast.until > now);
    const free = TOAST_SLOTS - shown.length;
    const taking = free > 0 ? state.queue.slice(0, free) : [];

    if (taking.length === 0 && shown.length === state.shown.length) {
        return state;
    }
    return {
        queue: state.queue.slice(taking.length),
        shown: [
            ...shown,
            ...taking.map((event) => ({ event, until: now + TOAST_MS })),
        ],
    };
};

/**
 * Der Verbindungszustand gehört dem Socket, nicht React — deshalb abonniert
 * statt gespiegelt. Ein `setState` im Effekt-Körper wäre hier nur eine
 * zweite Quelle für dieselbe Wahrheit.
 */
const subscribeToSocket = (onChange: () => void) => {
    const socket = getSocket();
    socket.on('connect', onChange);
    socket.on('disconnect', onChange);
    return () => {
        socket.off('connect', onChange);
        socket.off('disconnect', onChange);
    };
};

/**
 * Der Board-Zustand aus REST **und** Socket.
 *
 * Der REST-Abruf ist die Grundlage und pollt weiter; der Socket schiebt
 * dazwischen den frisch gerechneten Zustand nach. Wer gewinnt, entscheidet
 * `computedAt` — sonst könnte eine langsame Poll-Antwort einen neueren
 * Socket-Zustand überschreiben und auf der Leinwand stünde sichtbar
 * Falsches.
 */
export const useBoard = (slug: string, allGames = false) => {
    const [live, setLive] = useState<BoardState | null>(null);
    const [toastState, setToastState] = useState<ToastState>(EMPTY);
    const connected = useSyncExternalStore(
        subscribeToSocket,
        () => getSocket().connected,
    );

    const polled = useQuery({
        queryKey: queryKeys.board(slug, allGames),
        queryFn: () => api.fetchBoard(slug, allGames),
        refetchInterval: POLL_MS,
    });

    const tournamentId = (live ?? polled.data)?.tournament.id;

    useEffect(() => {
        const socket = getSocket();

        const onBoard = (next: BoardState) =>
            setLive((current) =>
                current && current.computedAt > next.computedAt
                    ? current
                    : next,
            );
        const onAnnounce = (events: Announcement[]) =>
            setToastState((current) => ({
                ...current,
                queue: [...current.queue, ...events],
            }));
        socket.on('board:update', onBoard);
        socket.on('event:announce', onAnnounce);

        return () => {
            socket.off('board:update', onBoard);
            socket.off('event:announce', onAnnounce);
        };
    }, []);

    // Erst beitreten, wenn die ID bekannt ist — sie steht im Payload, nicht
    // in der Route. Nach einem Reconnect erneut, der Server vergisst Räume.
    useEffect(() => {
        if (!tournamentId) return;
        const socket = getSocket();
        const join = () => socket.emit('room:join', { tournamentId });

        join();
        socket.on('connect', join);
        return () => {
            socket.off('connect', join);
        };
    }, [tournamentId]);

    useEffect(() => {
        const tick = setInterval(
            () => setToastState((current) => pump(current, Date.now())),
            TICK_MS,
        );
        return () => clearInterval(tick);
    }, []);

    const board = (() => {
        if (!live) return polled.data;
        if (!polled.data) return live;
        return polled.data.computedAt > live.computedAt ? polled.data : live;
    })();

    return {
        board,
        toasts: toastState.shown.map((toast) => toast.event),
        connected,
        error: polled.error,
    };
};
