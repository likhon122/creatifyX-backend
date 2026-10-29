import httpStatus from 'http-status';
import { mongoUrl } from '../config';
import AppError from '../errors/appError';
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

const connectDB = async () => {
  if (!mongoUrl) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'MongoDB connection URL is not defined. Please verify MONGODB_URI in your environment variables.'
    );
  }

  // Reuse existing connection if ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Create connection promise once if not already connecting
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Prevents operations from hanging for 10s if disconnected
      serverSelectionTimeoutMS: 5000, // Fast fail after 5s instead of hanging for 30s
      maxPoolSize: 10, // Optimal pool size for serverless lambdas
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(mongoUrl, opts)
      .then(m => {
        console.log('MongoDB connected successfully');
        return m;
      })
      .catch(err => {
        cached.promise = null; // Reset promise on error so next request can retry
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('Error connecting to MongoDB:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to connect to MongoDB: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export default connectDB;
