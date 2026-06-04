# Enterprise Backend

Production-oriented Node.js, Express, TypeScript, Prisma, Redis, JWT, and BullMQ backend.

## Architecture

```text
src/
  config/          environment and infrastructure adapters
  modules/         domain modules
  middlewares/     cross-cutting Express middleware
  database/        Prisma client and schema
  cache/           Redis clients and utilities
  utils/           logging, crypto, constants, helpers
  validators/      shared Zod schemas
  types/           global TypeScript types
  jobs/            scheduled/background job entrypoints
  docs/            architecture notes
  app.ts           Express app setup
  server.ts        process bootstrap and graceful shutdown
```

## Core Rules

- Controllers stay thin.
- Business logic lives in services.
- Prisma access stays out of controllers.
- All external input is validated with Zod.
- JWT uses RS256 only.
- Browser auth uses HttpOnly cookies, not `localStorage`.
- Refresh tokens are rotated and stored only as hashes.
- Audit logging is asynchronous through BullMQ.
- Logs are structured and secrets are redacted.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and provide real JWT keys.

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Start development server:

```bash
npm run dev
```

## Docker

```bash
docker compose up --build
```

Use Docker Compose for local PostgreSQL and Redis. Production deployments should run API and workers as separate processes with separate scaling rules.

## Verification

```bash
npm run build
```

## Project Memory

Long-term architecture and AI collaboration rules live in `prompt_architecture.md`.
