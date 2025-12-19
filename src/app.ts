import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { frontendUrl } from './app/config';
import router from './app/routes';
import notFoundErrorHandler from './app/middlewares/notFoundErrorHandler';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import stripeRoutes from './app/modules/stripe/stripe.routes';

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

// All Routes are here
app.use('/api/v1', router);

// 404 Not Found error Handler
app.use(notFoundErrorHandler);

// Global error handler
app.use(globalErrorHandler);

export default app;
