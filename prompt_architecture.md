# PROJECT OVERVIEW

## Purpose

This project is a large-scale, AI-assisted SaaS platform built with a security-first full-stack architecture. The system must support authenticated users, role-based access, session/device tracking, audit logging, asynchronous jobs, scalable APIs, and future AI-assisted workflows.

This file is the persistent AI memory layer for the project. It should be treated as the centralized architecture brain used by humans and AI agents to preserve context, reduce repeated prompting, and maintain consistency across implementation work.

## Business Goals

- Build a production-ready SaaS backend and frontend foundation.
- Preserve security, maintainability, scalability, and observability from the first release.
- Enable multiple AI coding tools to work on the project without losing project context.
- Reduce implementation drift by storing architectural decisions and reusable prompts centrally.
- Support future enterprise requirements such as audit trails, compliance reviews, rate limits, RBAC, background jobs, and deployment automation.

## Target Users

- SaaS application users who need secure login, persistent sessions, and protected workflows.
- Admin and operations users who need auditability, role control, and platform visibility.
- Developers and AI agents contributing to the codebase.
- Security reviewers validating authentication, authorization, logging, and data-handling rules.

## Main Features

- JWT authentication using RS256 asymmetric keys.
- Refresh token rotation with persistence.
- Redis-backed JWT blacklist.
- Secure HttpOnly cookie token transport.
- Request validation with Zod.
- Centralized error handling.
- Prisma database access.
- Redis caching and rate limiting.
- BullMQ audit queue.
- Pino structured logging.
- Request IDs and request tracing.
- RBAC and clearance-level authorization.
- Device/session tracking.
- Soft-delete-ready database models.

## Product Vision

Create a secure, extensible SaaS platform foundation that can grow into a multi-module enterprise application. The platform should make new feature development predictable: each domain owns its routes, controllers, services, validators, types, jobs, and tests while shared infrastructure remains centralized.

---

# SYSTEM ARCHITECTURE

## High-Level Architecture

```mermaid
flowchart LR
  U[User / Browser] --> FE[Frontend App]
  FE --> API[Express API]
  API --> AUTH[Auth Module]
  API --> USER[User Module]
  API --> ADMIN[Admin Module]
  API --> AUDIT[Audit Service]
  AUTH --> DB[(PostgreSQL via Prisma)]
  USER --> DB
  ADMIN --> DB
  AUTH --> REDIS[(Redis)]
  API --> REDIS
  AUDIT --> Q[BullMQ auditQueue]
  Q --> WORKER[Audit Worker]
  WORKER --> DB
  API --> LOGS[Pino Logs]
```

## Frontend Architecture

Target frontend architecture:

- Framework: React/Next.js or equivalent TypeScript SPA/SSR framework.
- Auth transport: HttpOnly cookies only. Never store JWTs in `localStorage`.
- State: server state through query/cache library; local UI state colocated.
- API client: typed HTTP client with standardized response/error handling.
- Validation: Zod or shared schemas for forms.
- Routing: route groups by feature/domain.
- Security: CSRF token support, secure same-site cookies, CSP compatibility.

## Backend Architecture

Current backend is module/domain-based:

- `src/app.ts`: Express configuration, global middleware, routes.
- `src/server.ts`: HTTP listen, startup, graceful shutdown.
- `src/modules/auth`: authentication domain.
- `src/modules/audit`: audit queue, audit service, audit worker.
- `src/modules/user`: user-facing domain.
- `src/modules/admin`: admin domain.
- `src/middlewares`: cross-cutting middleware.
- `src/database`: Prisma client and schema.
- `src/cache`: Redis clients and typed utilities.
- `src/validators`: reusable Zod schemas.
- `src/utils`: logger and shared utilities.

Controllers must stay thin. Business logic belongs in services. Prisma access belongs in services, repositories, or workers, not controllers.

## Authentication Flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant API as Express API
  participant AUTH as Auth Service
  participant DB as PostgreSQL
  participant R as Redis
  participant Q as Audit Queue

  B->>API: POST /api/auth/login
  API->>API: Zod validate body
  API->>AUTH: loginUser(input, req)
  AUTH->>R: check login attempts
  AUTH->>DB: find user
  AUTH->>AUTH: bcrypt compare
  AUTH->>DB: create session + refresh token
  AUTH->>R: track active session
  AUTH->>AUTH: sign RS256 access/refresh tokens
  AUTH->>Q: enqueue audit event
  API->>B: Set HttpOnly cookies + CSRF token
```

## WebSocket Architecture

Target websocket architecture:

- Authenticate socket connection using cookie-backed access token or short-lived socket token.
- Validate token with RS256 public key and Redis blacklist.
- Store presence in Redis sorted sets.
- Keep websocket authorization rules aligned with REST RBAC.
- Do not trust client-provided user IDs.
- Include `requestId`, `sessionId`, and `deviceId` in socket audit events where possible.

```mermaid
flowchart TD
  Client --> Gateway[WebSocket Gateway]
  Gateway --> Auth[JWT Verification]
  Auth --> Redis[Redis Presence / Token Blacklist]
  Gateway --> Modules[Domain Event Handlers]
  Modules --> Queue[Async Event Queues]
```

## Caching Architecture

- Redis is the primary cache and coordination layer.
- Use typed key helpers only.
- All cache entries must have explicit TTLs unless intentionally persistent.
- Redis failures should degrade gracefully for non-critical paths.
- Security-critical Redis failures must fail closed where appropriate.

## Queue Architecture

- BullMQ is the queue engine.
- Current queue: `auditQueue`.
- Audit events must never block request completion.
- Queue jobs must be idempotent where possible.
- Failed jobs must retry with exponential backoff.

## Deployment Architecture

```mermaid
flowchart LR
  CDN[CDN / Edge] --> FE[Frontend]
  FE --> LB[Load Balancer]
  LB --> API1[API Instance 1]
  LB --> API2[API Instance 2]
  API1 --> PG[(PostgreSQL)]
  API2 --> PG
  API1 --> REDIS[(Redis)]
  API2 --> REDIS
  REDIS --> WORKERS[Worker Pods]
  WORKERS --> PG
  API1 --> OBS[Logs / Metrics / Traces]
  API2 --> OBS
  WORKERS --> OBS
```

---

# TECH STACK

## Frontend Stack

- TypeScript
- React/Next.js target
- Zod for form/input validation
- Typed API client
- Secure cookie-based authentication
- Component-driven UI architecture

## Backend Stack

- Node.js
- Express
- TypeScript
- Prisma
- Zod
- JWT with RS256
- Pino

## Database

- PostgreSQL target
- Prisma ORM
- UUID primary keys
- Timestamped models
- Soft-delete-ready schemas

## Cache

- Redis
- `ioredis`
- Typed Redis key helpers
- Graceful fallback utilities

## Queue

- BullMQ
- Redis-backed queues
- Current queue: `auditQueue`

## Infrastructure

- Docker target
- Docker Compose for local orchestration
- Kubernetes-ready deployment model
- Separate API and worker processes

## Monitoring

- Pino structured logs
- OpenTelemetry target
- Sentry target
- Metrics target: Prometheus-compatible metrics

## Testing

- Unit tests for services and utilities.
- Integration tests for auth, API contracts, database behavior, and Redis behavior.
- Security tests for auth/session/token flows.
- E2E tests for frontend-critical user journeys.

## CI/CD

- TypeScript build
- Lint
- Test
- Prisma schema validation
- Dependency audit
- Docker build
- Migration deploy gate

---

# FOLDER STRUCTURE

## Backend

```text
src/
  config/
    env.ts
  modules/
    auth/
      controllers/
      services/
      middlewares/
      validators/
      routes/
      types/
      utils/
    user/
      controllers/
      services/
      validators/
      routes/
      types/
    audit/
      queues/
      workers/
      services/
      types/
    admin/
      controllers/
      services/
      routes/
      validators/
      types/
  middlewares/
  utils/
  database/
    prisma.ts
    prisma/
      schema.prisma
      migrations/
      seed.ts
  cache/
  validators/
  types/
  jobs/
  docs/
  app.ts
  server.ts
```

## Frontend

```text
apps/web/
  src/
    app/
    components/
      ui/
      layout/
      forms/
    features/
      auth/
      user/
      admin/
      dashboard/
    lib/
      api/
      auth/
      validation/
      config/
    hooks/
    styles/
    types/
    tests/
```

## Shared Packages

```text
packages/
  config/
  eslint-config/
  tsconfig/
  schemas/
  api-client/
  types/
```

## Infrastructure

```text
infra/
  docker/
  compose/
  k8s/
    api/
    worker/
    web/
    redis/
    postgres/
  terraform/
  scripts/
```

---

# CODING STANDARDS

## TypeScript Rules

- Strict mode must remain enabled.
- Use `noUnusedLocals`, `noUnusedParameters`, `incremental`, and `verbatimModuleSyntax`.
- Do not use `any`.
- Prefer `unknown` plus narrowing over unsafe casts.
- Use explicit interfaces/types at module boundaries.
- Use `import type` for type-only imports.
- Use async/await only.
- Avoid business logic in route files or controllers.

## API Conventions

- All API responses must use a standardized envelope.
- Success:

```json
{
  "success": true,
  "data": {}
}
```

- Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message.",
    "details": {}
  }
}
```

## Naming Conventions

- Files: `kebab-case` or `domain.type.ts` style already used in backend.
- Controllers: `*.controller.ts`.
- Services: `*.service.ts`.
- Routes: `*.routes.ts`.
- Middleware: `*.middleware.ts`.
- Validators/schemas: `*.schema.ts`.
- Utilities: `*.util.ts`.
- Types: `*.types.ts`.

## Security Rules

- Never trust `req.body` directly.
- Validate all external input with Zod.
- Never store JWTs in `localStorage`.
- Never expose refresh tokens in JSON responses.
- Never log secrets, tokens, passwords, cookies, or authorization headers.
- Use HttpOnly secure cookies for browser auth.
- Use RBAC/clearance middleware for protected routes.

## Validation Rules

- Validate body, query, params, and headers where applicable.
- Transform emails to lowercase and trimmed form.
- Use bounded string lengths.
- Use UUID validation for IDs.
- Keep validation schemas close to modules when domain-specific and reusable under `src/validators` when shared.

## Logging Rules

- Use Pino.
- Include `requestId`.
- Include `userId` and `sessionId` when available.
- Use structured logs only.
- Redact secrets.
- Development logs can be pretty; production logs must be JSON.

## Error Handling Conventions

- Route handlers must call `next(error)`.
- Centralized error middleware owns response formatting.
- Hide internal errors in production.
- Map Zod, Prisma, JWT, auth, and unknown errors explicitly.

---

# AUTHENTICATION ARCHITECTURE

## JWT Strategy

- Algorithm: RS256 only.
- Private key signs tokens.
- Public key verifies tokens.
- Access tokens are short-lived.
- Refresh tokens are longer-lived and persisted by hash.
- Each token must include a `jti`.
- JWT issuer and audience must be validated.

## Refresh Token Flow

1. User logs in.
2. Server creates session.
3. Server creates refresh token hash in database.
4. Server sets access and refresh tokens in HttpOnly cookies.
5. Client calls refresh endpoint when needed.
6. Server verifies refresh token.
7. Server checks persisted hash.
8. Server revokes old token and creates replacement token.
9. Server sets rotated cookies.

## Session Handling

- Sessions are stored in PostgreSQL.
- Active session references are tracked in Redis sorted sets.
- Maximum concurrent sessions are enforced.
- Sessions support device ID, device fingerprint, IP, user agent, geo location, expiry, last seen, and revocation.

## CSRF Strategy

- Architecture supports double-submit CSRF.
- CSRF token can be returned after login/refresh.
- CSRF cookie must not be HttpOnly because the frontend needs to submit it.
- Server should validate `X-CSRF-Token` on unsafe methods when full CSRF enforcement is enabled.

## RBAC Model

Current roles:

- `SUPER_ADMIN`
- `ADMIN`
- `OPERATOR`
- `ANALYST`
- `OBSERVER`

Role hierarchy:

```text
SUPER_ADMIN: 100
ADMIN: 80
OPERATOR: 60
ANALYST: 40
OBSERVER: 20
```

## Device/Session Tracking

- Accept optional `X-Device-Id`.
- Derive device fingerprint from user agent, accept-language, and device ID.
- Store IP and user agent.
- Store geo location only when provided by trusted infrastructure.

## Redis Token Blacklist

- Store revoked JWT `jti` values with TTL equal to remaining token lifetime.
- Check blacklist during access and refresh token verification.
- Logout revokes access and refresh tokens.

## Rate Limiting Rules

- Global API rate limit.
- Stricter auth rate limit.
- AI endpoints require separate rate limit.
- Login attempts tracked by normalized email.
- Account lockout after repeated failures.

---

# DATABASE ARCHITECTURE

## Provider

- PostgreSQL.
- Prisma ORM.

## Prisma Standards

- Prisma schema lives at `src/database/prisma/schema.prisma`.
- Prisma client wrapper lives at `src/database/prisma.ts`.
- Use Prisma in services/workers, not controllers.
- Use transactions for multi-write auth/session flows.
- Log slow queries.

## Indexing Rules

- Index auth lookup fields.
- Index session lookup fields.
- Index refresh token session/user/revocation fields.
- Index audit log actor/session/action/risk/timestamp fields.
- Index soft delete fields where used.

## Schema Conventions

- UUID primary keys.
- `createdAt` and `updatedAt` on all persistent models.
- `deletedAt` for soft-delete readiness.
- Hash secrets before persistence.
- Persist refresh tokens as hashes only.

## Migration Strategy

- Use Prisma migrations.
- Never edit applied migrations.
- Use review gates for production migration deploys.
- Backfill data with explicit scripts when schema changes require it.

## Soft Delete Strategy

- Prefer `deletedAt` over hard deletes for core business records.
- Queries for active records must filter `deletedAt: null`.
- Hard delete only for ephemeral or explicitly purgeable data.

## Audit Logging Strategy

- Audit writes are asynchronous through BullMQ.
- Audit logging must never block requests.
- Do not directly call SIEM webhooks from request middleware.
- SIEM forwarding, if needed, belongs in workers or downstream pipelines.

---

# API DESIGN RULES

## REST Conventions

- Use nouns for resources.
- Use HTTP verbs correctly.
- Use nested routes only when ownership is clear.
- Keep route files declarative.
- Keep controllers thin.

## Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

## Pagination Rules

- Use cursor pagination for large collections.
- Use limit caps.
- Response shape:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pageInfo": {
      "nextCursor": null,
      "hasNextPage": false
    }
  }
}
```

## Filtering Rules

- Validate filter inputs with Zod.
- Whitelist sortable fields.
- Never pass arbitrary client filter objects directly into Prisma.

## Validation Standards

- Validate body, query, params, and headers.
- Reject unknown fields for sensitive endpoints where appropriate.
- Normalize inputs before service calls.

## API Versioning Strategy

- Start stable routes under `/api`.
- Introduce `/api/v1` before public external clients depend on the API.
- Breaking changes require versioned routes or compatibility shims.

---

# SECURITY STANDARDS

## OWASP Practices

- Validate all inputs.
- Encode outputs in frontend.
- Use secure cookies.
- Prevent injection by using ORM and parameterized APIs.
- Enforce authentication and authorization separately.
- Rate limit sensitive routes.
- Redact logs.
- Use least privilege for database and infrastructure credentials.

## CSP Policy

- Default source: self.
- Script source: self plus nonce when inline script is required.
- Object source: none.
- Frame source: none unless explicitly needed.
- Image source can include self, data, and blob.
- Production should enforce HTTPS upgrades.

## Headers

- Use Helmet.
- Disable `x-powered-by`.
- Enable HSTS in production.
- Use `X-Request-Id`.
- Restrict CORS origins.

## Cookie Rules

- Auth cookies must be HttpOnly.
- Auth cookies must be `secure` in production.
- Use `sameSite: strict` by default.
- Refresh cookie path should be scoped to refresh endpoint.
- Do not expose refresh tokens to JavaScript.

## Encryption Rules

- Use TLS in transit.
- Use managed encryption at rest for production database/Redis.
- Store asymmetric JWT private keys securely.
- Rotate secrets through environment/secret manager.

## Hashing Rules

- Passwords: bcrypt with configured rounds.
- Refresh tokens: SHA-256 hash before database persistence.
- Reset tokens/OTP: hash before persistence.

## Audit Logging Rules

- Log authentication events.
- Log failed login events.
- Log token refresh events.
- Log logout events.
- Log high-risk API errors.
- Include request/session/device context.
- Avoid sensitive payload logging.

## SIEM Integration Rules

- Do not call SIEM webhooks from request path.
- Send SIEM events from queue workers or log pipelines.
- High-risk events should include normalized risk score.

---

# REDIS ARCHITECTURE

## Caching Strategy

- Use Redis for short-lived shared state.
- Use typed helpers for keys.
- Prefer cache-aside for expensive reads.
- Do not cache sensitive raw tokens.

## TTL Strategy

- Every cache key must have an explicit TTL unless it represents active coordination state.
- JWT blacklist TTL equals remaining token lifetime.
- OTP TTL defaults to configured short window.
- Rate limit TTL equals limiter window.

## Queues

- BullMQ uses Redis.
- Queue workers run separately from API instances in production.

## Rate Limiting

- Express rate limiter uses Redis store.
- Global, auth, and AI-specific limiters are separate.

## Session Storage

- Source of truth: PostgreSQL.
- Redis tracks active session IDs per user for session cap enforcement.

## Blacklisted JWT Handling

- Key pattern: `jwt:block:{jti}`.
- Value: `1`.
- TTL: remaining token lifetime.

---

# QUEUE ARCHITECTURE

## BullMQ Setup

- Queue name: `auditQueue`.
- Queue files live in `src/modules/audit/queues`.
- Worker files live in `src/modules/audit/workers`.
- Workers must use concurrency from environment variables.

## Retry Policies

- Use exponential backoff.
- Default attempts: 3.
- Remove completed jobs after count/age threshold.
- Retain failed jobs longer for investigation.

## Dead-Letter Queues

Target pattern:

- After retries fail, send job payload to a dead-letter queue.
- Dead-letter queue should be monitored.
- Dead-letter replay must be explicit.

## Async Jobs

Use queues for:

- Audit persistence.
- Email sending.
- Webhook delivery.
- Report generation.
- AI processing tasks.
- SIEM forwarding.

## Email Jobs

Target queues:

- `emailQueue`
- Password reset emails.
- Verification emails.
- Security notification emails.

## Audit Jobs

Current:

- `auditQueue`
- `audit.log` jobs write `AuditLog` records.

---

# LOGGING & MONITORING

## Pino Logging Rules

- Use structured JSON logs in production.
- Pretty logs only in development.
- Redact auth headers, cookies, passwords, and tokens.
- Use child loggers by component.

## Log Levels

- `debug`: local development diagnostics.
- `info`: successful lifecycle and normal request events.
- `warn`: recoverable issues, blocked CORS, rate limits, validation failures.
- `error`: failed operations requiring investigation.
- `fatal`: unrecoverable process failures.

## Request Tracing

- Every request must have a request ID.
- Propagate request ID to logs, errors, audit events, and downstream calls.

## Metrics

Target metrics:

- Request count, latency, error rate.
- Auth success/failure count.
- Queue job completed/failed count.
- Redis availability.
- Database query latency.

## OpenTelemetry

Target integration:

- HTTP instrumentation.
- Prisma/database spans.
- Redis spans.
- Queue spans.
- Trace IDs included in logs.

## Sentry Integration

Target integration:

- Capture unhandled errors.
- Attach request ID and user ID where safe.
- Scrub sensitive data.
- Separate staging and production projects.

---

# ENVIRONMENT VARIABLES

## App

```env
NODE_ENV=development
PORT=5000
TRUST_PROXY=false
REQUEST_BODY_LIMIT=1mb
CORS_ORIGINS=http://localhost:3000,http://localhost:4000
```

## Auth

```env
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800
JWT_ISSUER=tactical-os
JWT_ACCESS_AUDIENCE=tactical-os-client
JWT_REFRESH_AUDIENCE=tactical-os-refresh
SESSION_SECRET=
CSRF_SECRET=
COOKIE_DOMAIN=
BCRYPT_ROUNDS=12
MAX_SESSIONS_PER_USER=5
OTP_TTL_SECONDS=300
```

## Database

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
```

## Redis

```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

## Queue

```env
AUDIT_QUEUE_CONCURRENCY=5
```

## Monitoring

```env
LOG_LEVEL=info
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=
```

## External APIs

```env
AI_SERVICE_URL=http://ai-service:8000
SIEM_WEBHOOK_URL=
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=
TURN_SECRET=
```

---

# DEPLOYMENT ARCHITECTURE

## Docker

Target services:

- `api`
- `worker`
- `web`
- `postgres`
- `redis`

## Docker Compose

Use Compose for local development:

- API with hot reload.
- Worker with hot reload.
- PostgreSQL volume.
- Redis volume.
- Optional frontend dev server.

## Kubernetes-Ready Structure

- Separate deployments for API and workers.
- Horizontal pod autoscaling for API.
- Worker scaling based on queue depth.
- ConfigMaps for non-secret config.
- Secrets for credentials and JWT keys.
- Readiness and liveness probes.

## CI/CD Pipeline

1. Install dependencies.
2. Type-check.
3. Lint.
4. Run tests.
5. Validate Prisma schema.
6. Build Docker images.
7. Run security/dependency audit.
8. Deploy staging.
9. Run smoke tests.
10. Promote to production.

## Staging/Production Separation

- Separate databases.
- Separate Redis instances.
- Separate JWT keys.
- Separate monitoring projects.
- Separate CORS origins.

## Scaling Strategy

- API is stateless aside from cookies and external persistence.
- Sessions persist in PostgreSQL.
- Redis coordinates blacklist/rate limits/session caps/queues.
- Workers scale independently.
- Database read scaling can be introduced through replicas when needed.

---

# AI AGENT RULES

These rules are mandatory for all AI agents and coding tools.

## Architecture Rules

- Preserve modular architecture.
- Add new domains under `src/modules/{domain}`.
- Do not put business logic in controllers.
- Controllers must validate/delegate/respond only.
- Services own business logic.
- Prisma access belongs in services, repositories, or workers.
- Cross-cutting behavior belongs in `src/middlewares`, `src/cache`, `src/database`, or `src/utils`.
- Follow SOLID principles without creating unnecessary abstractions.

## Security Rules

- Always validate external input with Zod.
- Never trust `req.body`, `req.query`, `req.params`, or headers directly.
- Never use `localStorage` for JWTs.
- Never return refresh tokens in response bodies.
- Never log secrets, passwords, cookies, auth headers, or raw tokens.
- Preserve RS256-only JWT handling.
- Preserve refresh token rotation.
- Preserve Redis token blacklist checks.
- Preserve HttpOnly cookie auth.
- Audit sensitive events asynchronously.

## TypeScript Rules

- Strict mode must stay enabled.
- Do not introduce `any`.
- Use strong types at boundaries.
- Use `async/await`.
- Use `import type` for type-only imports.
- Do not weaken compiler settings to make errors disappear.

## Implementation Rules

- Prefer existing project patterns.
- Update this file after major architecture or security changes.
- Add/update validators with every new API input.
- Add centralized errors instead of ad hoc response shapes.
- Add audit events for sensitive auth/admin/security actions.
- Do not duplicate utilities across modules.
- Do not bypass service layer from routes.

## Review Rules

- Check auth, authorization, validation, logging, and audit impact for every feature.
- Check whether new data needs indexing.
- Check whether background work should use a queue.
- Check whether an operation must be idempotent.

---

# REUSABLE PROMPTS

## Generate A New API Module

```text
Create a new backend module named {moduleName} under src/modules/{moduleName}.
Follow existing architecture:
- routes in routes/
- controllers in controllers/
- services in services/
- validators in validators/
- types in types/
Controllers must be thin.
Validate all inputs with Zod.
Use standardized success/error responses.
Do not use Prisma in controllers.
Add audit logging for sensitive actions.
Update prompt_architecture.md if architecture changes.
```

## Generate Prisma Schema Changes

```text
Update src/database/prisma/schema.prisma for {feature}.
Use UUID ids, createdAt, updatedAt, and deletedAt where appropriate.
Add indexes for lookup, filtering, auth, tenant, and timestamp queries.
Do not store secrets in plaintext.
Explain migration impact and backfill needs.
```

## Generate Frontend Page

```text
Create a production frontend page for {feature}.
Use TypeScript and feature-based structure.
Do not store JWTs in localStorage.
Use typed API client and standardized API response handling.
Validate forms with Zod.
Design for authenticated SaaS workflows, not a marketing landing page.
```

## Generate Secure Auth Feature

```text
Implement {authFeature} following project auth rules:
- RS256 JWT only
- HttpOnly cookies
- refresh token rotation
- Redis blacklist
- session/device tracking
- Zod validation
- centralized errors
- async audit logging
Never expose refresh tokens to frontend JavaScript.
```

## Generate Middleware

```text
Create middleware for {purpose}.
It must be strongly typed, composable, and side-effect aware.
Use standardized error forwarding with next(error).
Do not directly send inconsistent error formats unless it is an auth guard.
Include requestId in logs.
```

## Generate Queue

```text
Create a BullMQ queue for {jobType}.
Add queue file, worker file, payload types, retry policy, and shutdown handling.
Jobs must be idempotent where possible.
Do not block API requests on queue work.
Add monitoring/logging for failures.
```

## Generate Tests

```text
Generate tests for {feature}.
Cover success, validation failure, authorization failure, and service failure.
Mock external systems where appropriate.
Do not weaken production code to make tests pass.
```

## Generate Docker Config

```text
Create Docker and Docker Compose config for this project.
Separate API and worker processes.
Include PostgreSQL and Redis for local development.
Use environment variables from prompt_architecture.md.
Do not bake secrets into images.
```

---

# CURRENT PROJECT STATUS

## Completed Features

- Backend converted from flat files to modular `src/` architecture.
- Config adapters added for environment, Prisma, Redis, and app-level config.
- Dedicated rate-limit middleware added.
- Dockerfile, Docker Compose, README, and Docker ignore added.
- Shared crypto/constants/request helper utilities added.
- Socket.IO realtime server added with room join and room message broadcasting.
- Auth module created with controllers, services, middleware, validators, routes, types, and utils.
- RS256 JWT service implemented.
- Refresh token rotation and persistence implemented.
- Session tracking implemented.
- Redis JWT blacklist implemented.
- Redis cache utilities implemented.
- Centralized error middleware implemented.
- Zod auth schemas implemented.
- Security middleware implemented with Helmet, CORS, request size limits, rate limiting, sanitization, and CSRF-ready support.
- Pino logging implemented.
- Audit logging converted to BullMQ `auditQueue`.
- Audit worker implemented.
- Prisma schema created for User, Session, RefreshToken, AuditLog, and LoginAttempt.
- App/server split implemented.
- Graceful shutdown implemented.
- TypeScript build verified.

## Pending Features

- Add test framework and test suites.
- Add Dockerfile and Docker Compose.
- Add CI/CD pipeline.
- Add frontend application.
- Add OpenTelemetry instrumentation.
- Add Sentry integration.
- Add email queue.
- Add full CSRF validation middleware.
- Add API versioning strategy in routes.
- Add migration files after database connection is finalized.
- Add repository layer if domain complexity grows.

## Blockers

- Production database URL and Redis credentials are environment-specific.
- JWT private/public keys must be provisioned securely.
- No frontend implementation exists yet.
- No test runner is configured yet.

## Technical Debt

- Password reset request currently stores OTP-style data but does not yet send email.
- Full CSRF enforcement is architecture-ready but not fully enforced.
- SIEM forwarding is intentionally not implemented in request path and should be added through worker/log pipeline if needed.
- Current user/admin modules are skeletal.

## Upcoming Priorities

1. Add tests for auth service, JWT service, validation middleware, and error middleware.
2. Add Docker Compose for local PostgreSQL/Redis/API/worker.
3. Add migration generation workflow.
4. Add frontend auth shell.
5. Add CSRF enforcement middleware.
6. Add OpenTelemetry and Sentry.

---

# CHANGELOG

## 2026-05-28

### Added

- Modular backend architecture under `src/`.
- Auth, audit, user, and admin module scaffolds.
- Centralized error handling.
- Zod validation.
- Redis utility layer.
- BullMQ audit queue.
- Prisma schema.
- Pino logging.
- App/server split.
- Persistent AI architecture memory file.

### Changed

- Moved from flat backend files to domain/module architecture.
- Moved audit logging from direct request-path persistence to async queue processing.
- Moved auth validation out of controllers.

### Fixed

- Standardized error response shape.
- Preserved strict TypeScript build compatibility.

### Security

- Preserved RS256 JWT strategy.
- Preserved HttpOnly cookie auth.
- Added refresh token persistence and rotation model.
- Added Redis token blacklist support.
- Added request ID, rate limiting, CORS whitelist, secure headers, and request size limits.

---

# TOKEN OPTIMIZATION STRATEGY

## How AI Agents Should Read This File

- For backend implementation: read `PROJECT OVERVIEW`, `SYSTEM ARCHITECTURE`, `CODING STANDARDS`, `AI AGENT RULES`, and the relevant domain section.
- For auth/security work: read `AUTHENTICATION ARCHITECTURE`, `SECURITY STANDARDS`, `REDIS ARCHITECTURE`, and `AI AGENT RULES`.
- For database work: read `DATABASE ARCHITECTURE`, `API DESIGN RULES`, and `CURRENT PROJECT STATUS`.
- For infrastructure work: read `DEPLOYMENT ARCHITECTURE`, `ENVIRONMENT VARIABLES`, and `QUEUE ARCHITECTURE`.

## Mandatory Context

Always include or respect:

- `AI AGENT RULES`
- `CODING STANDARDS`
- Relevant architecture section for the task
- `CURRENT PROJECT STATUS`

## Optional Context

Use only when relevant:

- Frontend folder structure.
- Deployment details.
- Queue architecture.
- Monitoring targets.
- Reusable prompts.

## Minimize Token Usage

- Do not paste this entire file into every AI prompt.
- Reference section names instead.
- Summarize only changed sections.
- Use reusable prompts from this file and fill placeholders.
- For small tasks, provide only:
  - task goal
  - relevant files
  - applicable rules
  - expected output

## Efficient State Summary Format

Use this compact format when handing off between AI tools:

```text
Project: secure modular SaaS backend.
Stack: Node/Express/TS/Prisma/Redis/BullMQ/JWT RS256/Pino/Zod.
Rules: thin controllers, service logic only, no any, validate all input, HttpOnly JWT cookies, refresh rotation, Redis blacklist, async audit queue.
Current focus: {task}.
Relevant files: {files}.
Do not change: {constraints}.
```

---

# CONTEXT PERSISTENCE RULES

## Update This File When

- Architecture changes.
- Folder structure changes.
- New module is added.
- New database model or important field is added.
- API response contracts change.
- Auth/security policy changes.
- Environment variables change.
- New queue/job is added.
- Deployment strategy changes.
- Major feature is completed.
- Major technical debt is introduced or resolved.

## Required Update Sections

- Update `CURRENT PROJECT STATUS` after meaningful implementation work.
- Update `CHANGELOG` after major changes.
- Update `ENVIRONMENT VARIABLES` when config changes.
- Update `DATABASE ARCHITECTURE` when schema conventions change.
- Update `REUSABLE PROMPTS` when a new repeated workflow emerges.
- Update `AI AGENT RULES` when a standard must become permanent.

## Persistence Discipline

- Keep entries concise but specific.
- Avoid duplicate explanations.
- Prefer canonical decisions over scattered notes.
- Remove obsolete rules when architecture changes.
- Treat this file as the source of truth for AI collaboration context.
