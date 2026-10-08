import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2500', 10), // 2500 requests per 15 mins to support real-time transit polling
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  skip: (req) => {
    // Do not throttle development, health checks, or live transit polling endpoints
    return (
      process.env.NODE_ENV !== 'production' ||
      req.path.includes('/health') ||
      req.path.includes('/rides/active') ||
      req.path.includes('/rides/available')
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default apiLimiter;
