import express from 'express';
import { config } from '#config';
import { connectDb } from '#db';
import { apiRouter } from '#routes';
import { errorHandler, notFoundHandler } from '#middleware';

const app = express();

app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundHandler);
// Express 5 leitet abgelehnte Promises aus Handlern selbst hierher weiter,
app.use(errorHandler);

await connectDb();
app.listen(config.port, () => {
    console.log(`API läuft auf http://localhost:${config.port}/api`);
});
