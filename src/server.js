const mongoose = require('mongoose');
const { port, mongoUri, nodeEnv } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const start = async () => {
  try {
    await connectDB(mongoUri);
    const server = app.listen(port, () => {
      console.log(`Server running in ${nodeEnv} mode on port ${port}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

start();
