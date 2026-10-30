import app from '../src/app';
import connectDB from '../src/app/db/db';
import seedSuperAdmin from '../src/app/db/seedSuperAdmin';

let isSeeded = false;

// Trigger database connection and seed on container initialization
connectDB()
  .then(() => {
    if (!isSeeded) {
      seedSuperAdmin()
        .then(() => {
          isSeeded = true;
        })
        .catch(err => {
          console.error('Super admin background seed failed:', err);
        });
    }
  })
  .catch(err => {
    console.error('Initial DB warm-up error:', err);
  });

// Export Express app directly as the serverless function
export default app;
