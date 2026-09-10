import { defineConfig } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
// Der Port des API-Servers. Überschreibbar, damit sich eine zweite Instanz
// neben einer laufenden testen lässt.
const api = `http://localhost:${process.env.API_PORT ?? 4000}`;

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Hält alles same-origin, damit der Server kein CORS braucht.
        proxy: {
            '/api': api,
            // Socket.IO hängt am selben Server; ws: true schleust den
            // Upgrade durch, sonst bleibt der Client beim Polling hängen.
            '/socket.io': { target: api, ws: true },
            '/uploads': api,
        },
    },
});
