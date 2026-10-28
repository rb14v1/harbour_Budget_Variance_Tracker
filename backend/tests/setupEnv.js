process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in the environment before running tests.');
}
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.ORG_TIMEZONE = 'Asia/Kolkata';
process.env.SEED_ADMIN_EMAIL = 'admin@demo.com';
if (!process.env.SEED_ADMIN_PASSWORD) {
  throw new Error('SEED_ADMIN_PASSWORD must be set in the environment before running tests.');
}
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/unused';
