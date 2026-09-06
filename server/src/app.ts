import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import { logger } from './config/logger.js';
import { setupSwagger } from './config/swagger.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/appError.js';
import { sendSuccess } from './utils/response.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import sosRoutes from './routes/sosRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';


const app = express();

// Secure headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Compression middleware
app.use(compression());

// Parse requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Morgan HTTP request logging piped to Winston
const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Apply rate limiting to all APIs
app.use('/api', apiLimiter);

// API Documentation
setupSwagger(app);

// Authentication routes
app.use('/api/v1/auth', authRoutes);

// Payment routes
app.use('/api/v1/payments', paymentRoutes);

// Emergency SOS routes
app.use('/api/v1/sos', sosRoutes);

// 24/7 AI Chatbot routes
app.use('/api/v1/chatbot', chatbotRoutes);



// Basic health check endpoint
app.get('/api/v1/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  sendSuccess(res, {
    uptime: process.uptime(),
    dbState: states[dbState] || 'unknown',
  }, 'System is healthy');
});

// Catch-all route to trigger 404 AppError
app.all('*', (req, res, next) => {
  next(new AppError(`Resource ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

export { app };
