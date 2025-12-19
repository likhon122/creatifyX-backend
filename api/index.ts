import app from '../src/app';
import connectDB from '../src/app/db/db';
import seedSuperAdmin from '../src/app/db/seedSuperAdmin';

let isConnected = false;

// Initialize database connection
async function initializeDatabase() {
  if (!isConnected) {
    try {
      await connectDB();
      await seedSuperAdmin();
      isConnected = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }
}

// Initialize database on first request
initializeDatabase();

// Export the Express app as a serverless function
export default app;
