const env = require('./config/env');
const { connectDb, disconnectDb } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  await connectDb(env.MONGO_URI);
  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
