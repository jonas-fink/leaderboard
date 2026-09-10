import mongoose from 'mongoose';
import { config } from '#config';

/**
 * Bringt die Indizes der Collections auf den Stand der Schemas.
 *
 * `createIndexes` — Mongoose' Standardverhalten — legt fehlende an, entfernt
 * aber keine überzähligen. Nach dem Umbau von `Game` stand deshalb noch der
 * globale `slug_1 UNIQUE` in der Datenbank, obwohl der Slug laut §3 nur je
 * Turnier eindeutig ist: zwei Turniere hätten nie beide ein "Mario Kart"
 * haben können. `syncIndexes` räumt genau das ab und macht die Schemas zur
 * einzigen Wahrheit.
 *
 * ponytail: läuft bei jedem Start. Die Collections eines Events sind klein;
 * sollte das je spürbar werden, gehört es in ein Migrationsskript.
 */
const syncIndexes = async () => {
    const results = await Promise.all(
        Object.values(mongoose.models).map(async (model) => {
            const dropped = await model.syncIndexes();
            return dropped.length > 0 ? `${model.modelName}: ${dropped}` : null;
        }),
    );
    const changed = results.filter((entry) => entry !== null);
    if (changed.length > 0) {
        console.log('Veraltete Indizes entfernt —', changed.join(', '));
    }
};

export const connectDb = async () => {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, { dbName: config.dbName });
    await syncIndexes();
    return mongoose.connection;
};

export const disconnectDb = () => mongoose.disconnect();
