# Multi-Tenant Application (NestJS + Drizzle ORM + PostgreSQL)

A robust backend service built with NestJS, Drizzle ORM, and PostgreSQL featuring secure cookie-based JWT authentication (access & refresh tokens), token revocation, role/tenant foundations, environment validation, and health checks.

## Tech Stack
- **Framework:** NestJS (TypeScript)
- **Database & ORM:** PostgreSQL & Drizzle ORM (`@nestjs/drizzle`)
- **Authentication:** Passport.js (`passport-jwt`), Argon2 password hashing, secure `HttpOnly` cookies
- **Validation & Config:** `class-validator`, `class-transformer`, Joi config validation
- **Documentation & Health:** `@nestjs/swagger`, `@nestjs/terminus`
- **Testing:** Vitest (`npm test`, `npm run test:e2e`)

---

## Setup Steps

1. **Clone repository & install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start PostgreSQL using Docker Compose:**
   ```bash
   docker compose up -d
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations:**
   ```bash
   make db-migrate
   ```
   *(Or `pnpm drizzle-kit migrate`)*

5. **Start Development Server:**
   ```bash
   make dev
   ```
   *(Or `pnpm start:dev`)*

---

## Environment Variables (`.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/multitendb` |
| `JWT_ACCESS_SECRET` | Secret key for JWT access tokens | `super-secret-access-key` |
| `JWT_ACCESS_EXPIRES_IN` | Expiration time for access tokens | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | `super-secret-refresh-key` |
| `JWT_REFRESH_EXPIRES_IN` | Expiration time for refresh tokens | `30d` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `PORT` | Server listening port | `3000` |

---

## Available Commands (`Makefile`)

- `make install` - Install dependencies via pnpm
- `make build` - Build the application (`nest build`)
- `make dev` - Start development server with watch mode
- `make test` - Run unit tests (`vitest run`)
- `make test-e2e` - Run e2e tests
- `make db-generate` - Generate Drizzle migration files
- `make db-migrate` - Apply Drizzle migrations to database
- `make db-migration` - Generate and apply migrations in one command
- `make lint` - Run linter (`oxlint`)
