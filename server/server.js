require('dotenv').config();
require('express-async-errors');

const http = require('http');
const { Server: SocketServer } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const setupSocketHandlers = require('./socket/handler');
const { startScheduler } = require('./jobs/scheduler');
const { runAnalyticsJob } = require('./jobs/analyticsJob');
const AnalyticsSnapshot = require('./models/AnalyticsSnapshot');

const PORT = process.env.PORT || 5000;

// HTTP server
const httpServer = http.createServer(app);

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setupSocketHandlers(io);

// attach io
app.set('io', io);

// start server
const start = async () => {
  await connectDB();

  try {
    connectRedis();
  } catch (err) {
    console.log("Redis not connected (optional)");
  }

  startScheduler();

  // Clear stale snapshots on startup to force fresh data
  try {
    const stale = await AnalyticsSnapshot.deleteMany({});
    if (stale.deletedCount > 0) console.log(`🗑️  Cleared ${stale.deletedCount} stale analytics snapshots`);
  } catch {}

  runAnalyticsJob().catch(() => {});

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

start();

// graceful shutdown
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received — shutting down');
  httpServer.close(() => process.exit(0));
});