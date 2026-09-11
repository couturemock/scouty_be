# Scout-ly API (NestJS)

## Requisitos
- Node 20+
- PostgreSQL 16 (`docker compose up -d postgres` desde la raíz del monorepo)

## Desarrollo

```bash
cp .env.example .env
npm install
npm run start:dev
```

API: `http://localhost:4000/api`

Sin Stripe configurado, tras registrarte llama a `POST /api/billing/dev-activate` con `{ "plan": "basic" | "pro" }` (el frontend ya lo hace).

## Docker

Desde la raíz:

```bash
docker compose up --build
```

## Docs
- `../INTEGRATIONS.md` — Amazon/TikTok/Stripe/etc.
- `../STATUS.md` — hecho / pendiente
