import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { TEST_DATABASE_URL } from './test/test-env.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // creates the test database and applies the migrations once, before all files
    globalSetup: ['./test/global-setup.ts'],
    // overrides DATABASE_URL from .env, so e2e tests never touch the dev database.
    // NODE_ENV=test stops main.ts from calling bootstrap() when the tests import it
    // (otherwise every test file tries to listen on port 3000).
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test' },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
