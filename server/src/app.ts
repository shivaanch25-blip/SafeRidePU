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


import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const configured = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
    : ['http://localhost:5173', 'http://localhost:5000', 'http://127.0.0.1:5173'];

  if (configured.includes(origin)) return true;
  if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.includes('localhost')) {
    return true;
  }
  return false;
};

const app = express();

// Secure headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows Leaflet tiles and external CDNs
}));

// CORS configuration supporting comma-separated domains and Vercel/Render domains
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: origin ${origin} not allowed.`));
    }
  },
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

// Serve built client frontend static files in single-container production deployment
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/docs')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Catch-all route to trigger 404 AppError
app.all('*', (req, res, next) => {
  next(new AppError(`Resource ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

export { app };
