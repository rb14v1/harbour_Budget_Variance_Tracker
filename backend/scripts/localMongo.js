// Dev-only MongoDB 7 without Docker: runs the mongodb-memory-server binary with data persisted on disk.
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const dbPath = path.resolve(__dirname, '../../.mongo-data');
fs.mkdirSync(dbPath, { recursive: true });

MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' },
  binary: { version: '7.0.14' },
})
  .then((server) => {
    console.log(`MongoDB 7 running at ${server.getUri()} (data in ${dbPath}). Press Ctrl+C to stop.`);
    const stop = async () => {
      await server.stop({ doCleanup: false });
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((err) => {
    console.error('Could not start local MongoDB:', err.message);
    process.exit(1);
  });
