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
    await mongoose.connect(mongoUrl);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
