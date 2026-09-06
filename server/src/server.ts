import dotenv from 'dotenv';
// Load environment variables before importing other modules
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { logger } from './config/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Mongoose database
  await connectDatabase();

  const httpServer = createServer(app);

  // Initialize Socket.IO with CORS configuration
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Start HTTP and Socket server
  httpServer.listen(PORT, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((err) => {
  logger.error('Critical server startup error:', err);
  process.exit(1);
});
