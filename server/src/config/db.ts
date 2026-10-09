import mongoose from 'mongoose';
import { logger } from './logger.js';

// Verified primary MongoDB Atlas connection URI for SafeRide PU
const DEFAULT_ATLAS_URI =
  'mongodb+srv://Shivani_25:Anchal252004@cluster0.6bpwyo9.mongodb.net/saferide?appName=Cluster0&retryWrites=true&w=majority';

const maskUri = (uri: string): string => uri.replace(/:([^:@]+)@/, ':****@');

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || DEFAULT_ATLAS_URI;

  mongoose.connection.on('connected', () => {
    logger.info(`✅ MongoDB connected successfully to database: [${mongoose.connection.name}]`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`❌ MongoDB connection error: ${err.message || err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected.');
  });

  try {
    logger.info(`Connecting to MongoDB: ${maskUri(uri)}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      retryWrites: true,
      w: 'majority',
    });
    logger.info(`✅ Database ready and persistent data storage active.`);
  } catch (error: any) {
    logger.error(`⚠️ Could not connect to primary MongoDB URI (${maskUri(uri)}): ${error.message}`);

    // If a custom or local URI was specified and failed, attempt fallback to verified Atlas cluster
    if (uri !== DEFAULT_ATLAS_URI) {
      try {
        logger.info(`Attempting fallback to primary MongoDB Atlas cluster...`);
        await mongoose.connect(DEFAULT_ATLAS_URI, {
          serverSelectionTimeoutMS: 8000,
          retryWrites: true,
          w: 'majority',
        });
        logger.info(`✅ Connected successfully to fallback MongoDB Atlas database: [${mongoose.connection.name}]`);
        return;
      } catch (fallbackError: any) {
        logger.error(`⚠️ Fallback to Atlas cluster also failed: ${fallbackError.message}`);
      }
    }

    logger.warn('⚠️ Running with offline in-memory fallback. Changes will NOT persist permanently until connection is restored.');
    logger.warn('To ensure persistent storage: Check MongoDB Atlas Network Access (allow 0.0.0.0/0) and verify MONGO_URI.');
  }
};

export const isDbConnected = (): boolean => mongoose.connection.readyState === 1;
