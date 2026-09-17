import mongoose from 'mongoose';
import { logger } from './logger.js';

const DEFAULT_MONGO_URI =
  'mongodb+srv://Shivani_25:Shivani25@cluster0.6bpwyo9.mongodb.net/saferide?appName=Cluster0&retryWrites=true&w=majority';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

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
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    logger.warn(`⚠️ Could not connect to MongoDB at ${uri}. Running with offline in-memory fallback.`);
    logger.warn('To enable persistent data, ensure MongoDB Atlas Network Access allows 0.0.0.0/0 or configure MONGO_URI.');
  }
};

export const isDbConnected = (): boolean => mongoose.connection.readyState === 1;
