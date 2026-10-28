const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'MONGO_URI must be a mongodb:// URI'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CLIENT_ORIGIN: z.string().url(),
  ORG_TIMEZONE: z.string().default('Asia/Kolkata'),
  CURRENCY: z.string().default('INR'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  bcryptRounds: env.NODE_ENV === 'test' ? 4 : 12,
  loginRateLimitMax: env.NODE_ENV === 'test' ? 1000 : 10,
  jwtExpiresIn: '8h',
  cookieMaxAgeMs: 8 * 60 * 60 * 1000,
};
