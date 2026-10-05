import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://btin7al_user:btin7al_secure_pass@localhost:5432/btin7al_db?sslmode=disable',
  },
  verbose: true,
  strict: true,
});
