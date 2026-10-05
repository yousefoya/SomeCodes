import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths for .env file resolution
const candidatePaths = [
  path.resolve(__dirname, '../../.env'), // Backend root: <project_root>/al7btin_backend/.env
  path.resolve(process.cwd(), '.env'), // Current execution directory
  path.resolve(process.cwd(), 'al7btin_backend/.env'), // Parent directory invocation
  path.resolve(__dirname, '../../../.env'), // Workspace root
];

export let loadedEnvFilePath: string = '';

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    if (!loadedEnvFilePath) {
      loadedEnvFilePath = p;
    }
  }
}

if (!loadedEnvFilePath) {
  dotenv.config();
  loadedEnvFilePath = path.resolve(process.cwd(), '.env');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().default('postgresql://btin7al_user:btin7al_secure_pass@localhost:5432/btin7al_db?sslmode=disable'),
  DATABASE_POOL_MIN: z.string().transform((val) => parseInt(val, 10)).default('2'),
  DATABASE_POOL_MAX: z.string().transform((val) => parseInt(val, 10)).default('10'),
  DATABASE_IDLE_TIMEOUT: z.string().transform((val) => parseInt(val, 10)).default('20'),
  DATABASE_CONNECT_TIMEOUT: z.string().transform((val) => parseInt(val, 10)).default('10'),
  
  // Authentication & Security
  JWT_ACCESS_SECRET: z.string().min(16).default('c4a89f92d8e417a80b182c4d92a176840192847a98b1c02938475a6b0c1d2e3f'),
  JWT_REFRESH_SECRET: z.string().min(16).default('7f8e9d0c1b2a3456789abcdef0123456789abcdef0123456789abcdef01234567'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // OTP Mode & Twilio Verify v2 Configuration
  DEV_OTP_MODE: z
    .string()
    .transform((val) => val.toLowerCase() === 'true' || val === '1')
    .default('false'),
  AUTH_OTP_MODE: z.enum(['twilio', 'development', 'test']).default('twilio'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  
  OTP_EXPIRY_MINUTES: z.string().transform((val) => parseInt(val, 10)).default('5'),
  OTP_MAX_ATTEMPTS: z.string().transform((val) => parseInt(val, 10)).default('5'),
  
  CORS_ORIGIN: z.string().default('*'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
