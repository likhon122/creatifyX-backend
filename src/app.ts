import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { frontendUrl } from './app/config';
import router from './app/routes';
import notFoundErrorHandler from './app/middlewares/notFoundErrorHandler';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import stripeRoutes from './app/modules/stripe/stripe.routes';
import connectDB from './app/db/db';

const app = express();

app.use(
  cors({
    origin: [frontendUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

app.use('/api/v1/stripe', stripeRoutes);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Liveness & Readiness health check probe for Azure App Service & Docker
app.get(['/health', '/api/v1/health'], (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'creatifyX-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Database connection verification middleware
app.use(async (req, res, next) => {
  // Allow OPTIONS preflight and health checks to succeed fast without DB check
  if (req.method === 'OPTIONS' || req.path === '/health' || req.path === '/api/v1/health') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// All Routes are here
app.use('/api/v1', router);

// 404 Not Found error Handler
app.use(notFoundErrorHandler);

// Global error handler
app.use(globalErrorHandler);

export default app;
