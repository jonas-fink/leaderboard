import mongoose from 'mongoose';
import { config } from '#config';

export const connectDb = async () => {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, { dbName: config.dbName });
    return mongoose.connection;
};

export const disconnectDb = () => mongoose.disconnect();
