import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'node:path';

// Load .env from root workspace
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: './src/schemas/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inveeta_dev',
  },
  verbose: true,
  strict: true,
});
