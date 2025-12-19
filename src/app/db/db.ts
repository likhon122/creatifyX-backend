import httpStatus from 'http-status';
import { mongoUrl } from '../config';
import AppError from '../errors/appError';
import mongoose from 'mongoose';

const connectDB = async () => {
  if (!mongoUrl) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'MongoDB connection URL is not defined'
    );
  }

  try {
    // For serverless, reuse existing connection
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to connect to MongoDB'
    );
  }
};

export default connectDB;
