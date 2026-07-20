# Deployment

Two supported paths. **Path A (Vercel + Neon + Upstash)** is recommended to
start: every piece has a free tier, zero servers to maintain, and deploys on
every git push. **Path B (single VPS with Docker)** suits full control later.

---

## Path A — Vercel + Neon + Upstash (free tiers)

### A1. Database — Neon (free serverless Postgres)

1. <https://neon.tech> → sign up with GitHub → **Create project**
   (name `amity-arts`, region **AWS ap-southeast-1 Singapore** — closest to India).
2. Copy the **pooled** connection string (host contains `-pooler`), it looks like
   `postgresql://USER:PASS@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. Push the schema and seed from your machine:

```bash
cd "Amity-Art-s-"
DATABASE_URL="<neon-pooled-url>" npx prisma migrate deploy
DATABASE_URL="<neon-pooled-url>" npm run db:seed
```

### A2. Redis — Upstash (free tier, optional but recommended)

1. <https://upstash.com> → sign up → **Create database** (region ap-southeast-1).
2. Copy the **rediss://** connection URL (the "TLS" one, ioredis-compatible).
   Skipping this is safe: rate limiting fails open without Redis.

### A3. App — Vercel

1. <https://vercel.com/signup> → continue with GitHub.
2. **Add New → Project** → import `DDS5star/Amity-Art-s-` → select the
   `foundation` branch (or merge to `main` first and pick that).
3. Framework auto-detects Next.js. Before deploying, open
   **Environment Variables** and add (from `.env.production.example`):
   - `DATABASE_URL` — Neon pooled URL
   - `REDIS_URL` — Upstash rediss URL (optional)
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — two different outputs of
     `openssl rand -base64 48`
   - `NEXT_PUBLIC_APP_URL` — `https://<project>.vercel.app` for now; your
     domain later
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`
   - `WHATSAPP_*` once Meta onboarding completes
4. **Deploy**. Prisma client generates via the `postinstall` script; the build
   prerenders against Neon.
5. Smoke-test: `/` (storefront), `/admin` (login), `/sitemap.xml`, a product
   page, place a COD test order.

### A4. After the first deploy

- **Domain**: Vercel → Settings → Domains → add `amityarts.in`, update DNS,
  then set `NEXT_PUBLIC_APP_URL` to the domain and redeploy.
- **Razorpay webhook**: dashboard → Webhooks → URL
  `https://<domain>/api/payments/razorpay/webhook`, event `payment.captured`,
  same secret as `RAZORPAY_WEBHOOK_SECRET`.
- **Search Console**: <https://search.google.com/search-console> → add the
  domain → submit `https://<domain>/sitemap.xml`.
- **Seller GSTIN**: log into `/admin` → Settings → `gst.sellerGstin` so
  invoices carry it.
- **Change the seeded passwords** (`admin@amityarts.in` etc.) or delete the
  demo users in `/admin/users`.

### Free-tier limits to know

| Service | Free tier | Enough for |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/mo, serverless functions | early traffic; upgrade for a commercial storefront per Vercel ToS |
| Neon Free | 0.5 GB storage, autosuspend after idle | thousands of products/orders; first request after idle adds ~1s |
| Upstash Free | 10k commands/day | rate limiting comfortably |

---

## Path B — single VPS (Docker)

Any 2 GB VPS (Hetzner/DigitalOcean/Oracle free tier) with Docker installed.

```bash
git clone https://github.com/DDS5star/Amity-Art-s-.git && cd Amity-Art-s-
cp .env.production.example .env.production   # fill in values
docker compose -f docker-compose.prod.yml up -d db redis
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d app
```

Put nginx or Caddy in front for TLS (app listens on `127.0.0.1:3000`).
The image is the Next.js standalone bundle (verified: storefront, APIs and
invoice PDF generation all run from it).

---

## CI

`.github/workflows/ci.yml` runs lint, typecheck, migrations and the full test
suite (with real Postgres + Redis services) on every push to
`main`/`dev`/`foundation` and on PRs. Vercel deploys independently on push;
protect `main` with the CI check for a merge gate.
