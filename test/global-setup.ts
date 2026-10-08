import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { TEST_DATABASE_URL, TEST_DB_NAME, withDatabase } from './test-env.js';

/**
 * Runs once before all e2e files:
 * 1. creates the test database if it does not exist
 * 2. applies the migrations to it
 */
export default async function setup() {
  // connect to the maintenance database to be able to create the test one
  const admin = new pg.Client({
    connectionString: withDatabase(TEST_DATABASE_URL, 'postgres'),
  });
  await admin.connect();
  const { rowCount } = await admin.query(
    'select 1 from pg_database where datname = $1',
    [TEST_DB_NAME],
  );
  if (!rowCount) {
    await admin.query(`create database ${TEST_DB_NAME}`);
  }
  await admin.end();

  const db = drizzle(TEST_DATABASE_URL);
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.$client.end();
}
