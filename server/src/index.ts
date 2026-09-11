import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { config } from '#config';
import { connectDb } from '#db';
import { apiRouter } from '#routes';
import { errorHandler, notFoundHandler } from '#middleware';
import { initRealtime } from '#realtime';

const app = express();

// Die Anwendung steht hinter dem Tailscale Funnel, der auf localhost
// weiterreicht und die echte Adresse in X-Forwarded-For anhängt. Ohne das
// hier sähe die Anmeldebremse für jeden Besucher dieselbe IP.
app.set('trust proxy', 'loopback');

app.use(express.json());
// Hochgeladene Avatare und Banner. Liegen außerhalb des Codes in einem
// gemounteten Verzeichnis (§8) und sind offen lesbar wie das Board selbst.
app.use('/uploads', express.static(config.uploadDir));
app.use('/api', apiRouter);
// Im Container liegt das gebaute Frontend daneben und wird von hier
// ausgeliefert; lokal übernimmt das der Vite-Dev-Server.
if (config.clientDir) {
    app.use(express.static(config.clientDir));
    // Alles Übrige ist eine Client-Route: index.html, der Router entscheidet.
    app.get(/.*/, (_req, res) => {
        res.sendFile(join(config.clientDir!, 'index.html'));
    });
}
app.use(notFoundHandler);
// Express 5 leitet abgelehnte Promises aus Handlern selbst hierher weiter,
app.use(errorHandler);

// Socket.IO hängt am selben HTTP-Server; der Vite-Proxy hält alles
// same-origin, deshalb braucht der Server kein CORS.
const httpServer = createServer(app);
initRealtime(httpServer);

await connectDb();
httpServer.listen(config.port, () => {
    console.log(`API läuft auf http://localhost:${config.port}/api`);
});
