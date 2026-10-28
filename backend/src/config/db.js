const mongoose = require('mongoose');

// Validators and indexes are owned by migrations, never by Mongoose.
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);
mongoose.set('strictQuery', true);

async function connectDb(uri, options = {}) {
  await mongoose.connect(uri, options);
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
