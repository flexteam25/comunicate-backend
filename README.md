# POCA.GG Backend (NestJS) – Development Guide

NestJS backend for POCA.GG: site directory, reviews, fraud reports, community, points, and admin tooling. Architecture follows DDD with domain/application/infrastructure layers. See `system.md` for product scope and `DDD_ARCHITECTURE.md` for the target module layout.

## Tech Stack
- NestJS (HTTP + Socket.IO)
- PostgreSQL + TypeORM (migrations)
- Redis + BullMQ (queue, cache)
- JWT (access + refresh)
- Docker Compose (local infra)

## Prerequisites
- Node.js ≥ 18, npm ≥ 9
- Docker + Docker Compose
- PostgreSQL client tools (optional)

## Quick Start
1) Install deps
```bash
npm install
```

2) Configure env
```bash
cp .env.example .env
```
Update DB/Redis/JWT values to match your local setup (ports align with `docker-compose.yml`).

3) Start infra (PostgreSQL + Redis)
```bash
docker-compose up -d
```

4) Run migrations/seed (if defined)
```bash
npm run migration up
npm run seeder run
```

5) Start dev server
```bash
npm run start:dev
```
API defaults to `http://localhost:3008`.

## Scripts
- `npm run start:dev` — Nest dev server (hot reload)
- `npm run queue-worker:dev` — BullMQ worker (dev)
- `npm run socket-client:dev` — Socket client (if needed)
- `npm run migration up|down` — TypeORM migrations
- `npm run seeder run` — Seed data (if present)

## Project Structure
```
src/
├── modules/                  # DDD modules (per bounded context)
│   ├── auth/                 # auth credentials, tokens
│   ├── badge/                # badge system
│   └── user/                 # user profile
├── shared/                   # cross-cutting concerns
│   ├── constants/            # app-wide constants
│   ├── decorators/           # custom decorators
│   ├── domain/               # base domain classes
│   ├── dto/                  # shared DTOs
│   ├── filters/              # exception filters
│   ├── guards/               # auth guards
│   ├── logger/               # logging utilities
│   ├── middleware/           # HTTP middleware
│   ├── queue/                # BullMQ queue setup
│   ├── redis/                # Redis client/cache
│   ├── services/             # shared services
│   ├── socket/               # Socket.IO setup
│   └── utils/                # utility functions
├── migrations/               # TypeORM migrations
├── seeders/                  # seed data scripts
└── main.ts                   # application entry
```

### Module layering (per module)
- `domain/`: entities, value objects, domain events, repository ports.
- `application/`: use-case services (commands/queries), DTO/mappers.
- `infrastructure/`: adapters for persistence, cache, external services.
- `interface/`: controllers, resolvers, gateway handlers.

## Additional Docs
- `system.md` — product scope, API priorities (P0/P1/P2).
- `DDD_ARCHITECTURE.md` — proposed DDD layout and flows.
- `MIGRATIONS.md` — migration command usage.
- `QUEUE_ARCHITECTURE.md` — queue design (BullMQ).
