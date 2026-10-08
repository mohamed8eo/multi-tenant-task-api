import { existsSync, readFileSync } from 'node:fs';

export const TEST_DB_NAME = 'multitendb_test';

/** Same server and credentials as the given URL, but a different database name. */
export function withDatabase(url: string, database: string): string {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

function databaseUrlFromEnvFile(): string | undefined {
  if (!existsSync('.env')) return undefined;
  const line = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='));
  return line?.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
}

// The test database lives on the same Postgres server as your dev database
// (same user and password from .env), just under a different database name.
// Set TEST_DATABASE_URL to override completely.
const baseUrl =
  process.env.DATABASE_URL ??
  databaseUrlFromEnvFile() ??
  'postgresql://postgres:postgres@localhost:5432/postgres';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? withDatabase(baseUrl, TEST_DB_NAME);
