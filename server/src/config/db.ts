import mongoose from 'mongoose';
import { logger } from './logger.js';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/saferide';

  mongoose.connection.on('connected', () => {
    logger.info('Database connected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`Database connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Database disconnected.');
  });

  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
  } catch (error) {
    logger.warn(`⚠️ Could not connect to MongoDB at ${uri}. Running with offline in-memory fallback.`);
    logger.warn('To enable persistent data, start MongoDB locally or configure a free MongoDB Atlas URI in server/.env.');
  }
};

export const isDbConnected = (): boolean => mongoose.connection.readyState === 1;
