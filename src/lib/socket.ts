import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../schemas';

/**
 * Eine Verbindung für die ganze Anwendung. Board und Control-Panel treten
 * demselben Raum bei; zwei Sockets wären zwei Reconnect-Zustände für
 * denselben Zweck.
 *
 * Ohne URL verbindet sich Socket.IO zum eigenen Origin — der Vite-Proxy
 * leitet `/socket.io` samt Upgrade an den Server weiter, im Betrieb hängt
 * beides ohnehin am selben Host.
 */
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

export const getSocket = () => (socket ??= io());
