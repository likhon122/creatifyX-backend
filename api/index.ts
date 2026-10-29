import app from '../src/app';
import connectDB from '../src/app/db/db';
import seedSuperAdmin from '../src/app/db/seedSuperAdmin';

let isSeeded = false;

// Export serverless handler for Vercel
export default async function handler(req: any, res: any) {
  try {
    // 1. Ensure database is fully connected before processing any requests
    await connectDB();

    // 2. Run seed in the background once without blocking user requests
    if (!isSeeded) {
      seedSuperAdmin()
        .then(() => {
          isSeeded = true;
        })
        .catch(err => {
          console.error('Super admin background seed failed:', err);
        });
    }

    // 3. Forward request to Express app
    return app(req, res);
  } catch (error) {
    console.error('Vercel serverless function initialization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize database connection. Please check MongoDB connection string and network access.',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
