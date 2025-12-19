import { Server } from 'http';

import app from './app';
import { port } from './app/config';
import connectDB from './app/db/db';
import seedSuperAdmin from './app/db/seedSuperAdmin';

let server: Server;

async function main() {
  // Connect to the database
  await connectDB();

  // Seed the super admin user
  await seedSuperAdmin();

  server = app.listen(port, () => {
    console.log(`Server is running http://localhost:${port}`);
  });
}

main();

process.on('unhandledRejection', () => {
  console.log('👿 Shutting down the server due to Unhandled Promise Rejection');

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', () => {
  console.log('👿 Shutting down the server due to Uncaught Exception');
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
