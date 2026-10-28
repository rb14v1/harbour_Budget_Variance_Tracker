const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDb, disconnectDb } = require('../../src/config/db');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

function migrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.js')).sort();
}

// Applies the real migration files and records them in `changelog`, like migrate-mongo does.
async function migrateUp(db, client) {
  for (const file of migrationFiles()) {
    await require(path.join(MIGRATIONS_DIR, file)).up(db, client);
    await db.collection('changelog').insertOne({ fileName: file, appliedAt: new Date() });
  }
}

async function migrateDown(db, client) {
  for (const file of migrationFiles().reverse()) {
    await require(path.join(MIGRATIONS_DIR, file)).down(db, client);
    await db.collection('changelog').deleteOne({ fileName: file });
  }
}

async function setupDb() {
  const dbName = `test_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await connectDb(process.env.MONGO_URI, { dbName });
  await migrateUp(mongoose.connection.db, mongoose.connection.getClient());
  return mongoose.connection.db;
}

async function teardownDb() {
  await mongoose.connection.dropDatabase();
  await disconnectDb();
}

module.exports = { setupDb, teardownDb, migrateUp, migrateDown, migrationFiles };
