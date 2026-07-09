# Amity Art's — Jewellery E-commerce

Enterprise-grade luxury jewelry e-commerce platform with **retail (B2C)** and **wholesale (B2B)** channels. India-first: INR, GST invoicing, Razorpay, WhatsApp order notifications.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Prisma + PostgreSQL 16 · Redis 7 · Zod · JWT (access + rotating refresh) · Vitest

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design and [docs/ERD.md](docs/ERD.md) for the data model.

## Getting started

```bash
# 1. Infrastructure (Postgres on :5433, Redis on :6380)
docker compose up -d

# 2. Environment
cp .env.example .env   # defaults work for local dev

# 3. Install, migrate, seed
npm install
npm run db:migrate
npm run db:seed

# 4. Run
npm run dev            # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `npm run test` | Vitest suite |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:seed` | Seed attributes, zones, settings, demo catalog + users |
| `npm run db:studio` | Prisma Studio |

## Seeded logins (dev only)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@amityarts.in` | `Admin@12345` |
| Manager | `manager@amityarts.in` | `Manager@12345` |
| Wholesaler (approved) | `wholesaler@amityarts.in` | `Wholesale@12345` |
| Customer | `customer@amityarts.in` | `Customer@12345` |
