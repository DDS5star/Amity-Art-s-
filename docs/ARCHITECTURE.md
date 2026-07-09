# Amity Art's — System Architecture

Luxury jewelry e-commerce platform serving two channels from one codebase:

- **Retail (B2C):** luxury storefront, wishlist, cart, checkout (Razorpay / Stripe / COD), reviews, tracking.
- **Wholesale (B2B):** approval-gated accounts, wholesale + quantity-tier pricing, MOQ/pack-size rules, Excel-style size-matrix ordering, GST invoices, **Pay Later** credit terms.

## Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 15 monolith                      │
│                                                             │
│  App Router (RSC/SSR/ISR)          API route handlers       │
│  storefront · admin · wholesale    /api/** (thin controllers)│
│            │                              │                 │
│            └──────────┬───────────────────┘                 │
│                       ▼                                     │
│              src/server/services/*  (domain logic)          │
│              src/lib/*              (pure calculation)      │
│                       │                                     │
│         ┌─────────────┼─────────────┬───────────────┐       │
│         ▼             ▼             ▼               ▼       │
│      Prisma        ioredis      Adapters        AuditLog    │
│         │             │      (payments, email,              │
└─────────┼─────────────┼───────whatsapp, storage)────────────┘
          ▼             ▼             │
     PostgreSQL       Redis           ▼
     (source of    (rate-limit,   Razorpay · Stripe ·
      truth)        cache)        Meta WhatsApp Cloud API ·
                                  Cloudinary · SMTP
```

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend | Next.js monolith, not separate NestJS | One deploy, native SSR/SEO, end-to-end types. Services live behind `src/server/services/*` so they can be extracted to a standalone API if/when a mobile app outgrows the monolith. |
| PWA path | Next.js PWA (manifest + service worker) in the frontend phase | User plans a PWA app; the monolith's API routes double as the PWA's API. |
| Auth | JWT access (15 min, `Authorization` header) + rotating refresh token (30 d, httpOnly cookie, SHA-256-hashed at rest, reuse detection revokes the chain) | Stateless RBAC checks; refresh rows double as a session table for device management. |
| RBAC | `SUPER_ADMIN > MANAGER > WHOLESALER / CUSTOMER`, permission matrix in middleware | Manager cannot touch payments/settings/admins per spec; wholesaler routes additionally require `WholesalerProfile.status = APPROVED`. |
| Pricing | Pure functions in `src/lib/pricing.ts`: channel price → quantity tier (variant tier beats product tier; tier qty evaluated against the size-matrix group sum) → coupon → GST split | Deterministic, unit-testable money math; DB stores `Decimal(12,2)` INR. |
| GST | CGST+SGST when `placeOfSupplyState == warehouse state`, else IGST; snapshots frozen on the order | Legal correctness; invoice numbers gap-free per fiscal year via `InvoiceCounter` row lock. |
| Stock | `stockQty` column authoritative; every change writes a `StockMovement` ledger row in the same transaction; oversell guarded by conditional `UPDATE … WHERE stock_qty >= n` + DB CHECK | Prevents oversell races; ledger gives a full audit trail; nightly reconciliation possible. |
| Delivery ETA | **Both channels.** Warehouse pincode (SiteSetting `warehouse.pincode`, default 400064, admin-editable) → customer pincode 3-digit prefix → ShippingZone (min/max days) + lead time when out of stock | Zone-prefix matches courier rate-card reality (~800 rows); second warehouse later is a settings change. |
| WhatsApp | Adapter interface, Meta Cloud API driver; order events enqueue `WhatsAppMessageLog` rows (status QUEUED→SENT/FAILED with retries); sender no-ops with a log when env keys are absent | Auto order messages required on every order; platform must work before Meta onboarding completes. |
| Payments | Adapter interface: Razorpay, Stripe, COD, PAY_LATER (wholesale credit with `creditLimit/creditDays`, due-date tracking) | Wholesalers can skip payment at checkout and settle later. |
| Settings | `SiteSetting` key-value (JSON, Zod-validated) | Everything the admin must edit (warehouse origin, GST %, shipping rules, integration toggles) without redeploys. |
| Validation | Zod at every API boundary; consistent `{ success, data | error }` envelope | |
| Audit | `AuditLog` (actor, action, entity, before/after) written by mutating services | Enterprise traceability. |

## Module map

```
src/
├─ app/api/**            # HTTP layer only: parse → guard → service → envelope
├─ server/
│  ├─ services/          # auth, users, wholesalers, catalog, settings, shipping, whatsapp, audit
│  ├─ middleware/        # withAuth (JWT), withRole (RBAC matrix), withRateLimit (Redis)
│  ├─ adapters/          # whatsapp (meta), email (stub/smtp), payments (later), storage (later)
│  ├─ db.ts              # Prisma singleton
│  └─ redis.ts           # ioredis singleton
├─ lib/                  # pure: pricing, gst, inventory, delivery-estimate, tokens, validation/
└─ types/                # shared domain types
```

## Phased delivery

1. ✅ Scaffold, Docker (Postgres 16 + Redis 7), CI
2. ✅ Database: full Prisma schema (~34 models), migrations w/ raw-SQL constraints, seed
3. ✅ Core services + APIs (catalog, settings, pricing, inventory, shipping ETA, WhatsApp queue)
4. ✅ Auth + RBAC + admin user management + tests
5. Storefront UI (luxury design, 3D/Framer Motion/GSAP), 6. Admin dashboard, 7. Wholesale portal (Excel-grid), 8. Retail checkout + payments, 9. SEO, 10. Full test pass, 11. Deployment (Vercel + Docker), 12. Docs
