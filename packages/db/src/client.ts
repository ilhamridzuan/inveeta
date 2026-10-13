import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schemas from './schemas/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/inveeta_dev',
});

export const db = drizzle(pool, { schema: schemas });

export type Database = typeof db;
export type Schema = typeof schemas;
