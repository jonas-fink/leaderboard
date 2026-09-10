import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Hält alles same-origin, damit der Server kein CORS braucht.
        proxy: {
            '/api': 'http://localhost:4000',
            // Socket.IO hängt am selben Server; ws: true schleust den
            // Upgrade durch, sonst bleibt der Client beim Polling hängen.
            '/socket.io': { target: 'http://localhost:4000', ws: true },
            '/uploads': 'http://localhost:4000',
        },
    },
});
