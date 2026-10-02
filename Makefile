.PHONY: install build start dev lint test test-watch test-e2e db-generate db-migrate db-migration

install:
	pnpm install

build:
	pnpm build

start:
	pnpm start

dev:
	pnpm start:dev

lint:
	pnpm lint

test:
	pnpm test

test-watch:
	pnpm test:watch

test-e2e:
	pnpm test:e2e

db-generate:
	pnpm drizzle-kit generate

db-migrate:
	pnpm drizzle-kit migrate

db-migration:
	pnpm drizzle-kit generate && pnpm drizzle-kit migrate
