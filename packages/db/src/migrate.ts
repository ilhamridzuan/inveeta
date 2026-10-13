import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const migrationsFolder =
    process.env.MIGRATIONS_DIR || path.resolve(__dirname, 'migrations');

  console.log(`Running migrations from: ${migrationsFolder}...`);

  try {
    await migrate(db, { migrationsFolder });
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await runMigrations();
  } catch {
    process.exit(1);
  }
}
