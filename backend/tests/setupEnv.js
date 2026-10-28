process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.ORG_TIMEZONE = 'Asia/Kolkata';
process.env.SEED_ADMIN_EMAIL = 'admin@demo.com';
process.env.SEED_ADMIN_PASSWORD = 'Password@123';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/unused';
