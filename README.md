# Tendio

Tendio automatically finds public procurement tenders matched to a company's profile and suggests — with the help of AI — which ones are worth bidding on. Data comes from two sources: Poland's national **e-Zamówienia** and the EU-wide **TED (Tenders Electronic Daily)**.

## Features

- **Two tender sources** — e-Zamówienia (PL) and TED (EU-wide, queried by the profile's CPV codes).
- **Automatic ingestion** — a cron endpoint with a cursor and pagination accumulates far more than a single page of results.
- **Matching algorithm** — scoring by CPV codes, keywords and region; result shown as a match percentage.
- **On-demand AI analysis** — `gpt-4o-mini` (Vercel AI SDK) returns a summary and a `GO` / `SKIP` recommendation, with a per-account usage limit.
- **Editable company profile + presets** — custom searches plus ready-made presets (solar/PV, IT, roads).
- **Search and filters** — text, source, minimum match, sorting.
- **Authentication** — simple demo accounts with a signed session cookie.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Prisma 5](https://www.prisma.io/) + PostgreSQL ([Neon](https://neon.tech/))
- [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI (`gpt-4o-mini`)
- [Zod](https://zod.dev/) for validating AI responses

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Home page (profile + tender list)
│   ├── login/page.tsx              # Login
│   └── api/cron/ingest/route.ts    # Cron endpoint (data ingestion)
├── actions/
│   ├── tender.ts                   # Manual fetch (e-Zam / TED buttons)
│   ├── analyze.ts                  # AI analysis of a single tender
│   ├── profile.ts                  # Save profile / apply preset
│   └── auth.ts                     # Login / logout
├── lib/
│   ├── ingest.ts                   # e-Zamówienia fetching + cursor
│   ├── ted.ts                      # TED fetching + NUTS→voivodeship mapping
│   ├── tenders.ts                  # Shared persistence (dedup + scoring + insert)
│   ├── scoring.ts                  # Matching algorithm
│   ├── presets.ts                  # Saved searches (presets)
│   ├── auth.ts                     # Sessions + AI usage limit
│   └── prisma.ts                   # Prisma client singleton
├── components/                     # Client components (forms, list, filters)
prisma/
├── schema.prisma                   # Models: Tender, Profile, DemoUser, IngestState
├── migrations/                     # Postgres migrations
└── seed.ts                         # Default starting profile
```

## Requirements

- **Node.js 22+** (required by Next.js 16)
- A **PostgreSQL** database (the free [Neon](https://neon.tech/) tier works well)
- An **OpenAI API** key (for AI analysis)

## Configuration

Create a `.env` file in the project root:

```bash
# Database (Neon: pooled for the app, direct for migrations)
DATABASE_URL="postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://<user>:<pass>@<host>.<region>.aws.neon.tech/neondb?sslmode=require"

# OpenAI
OPENAI_API_KEY="sk-..."

# Demo accounts (format login:password, comma-separated)
DEMO_USERS="demo1:secretpass1,demo2:secretpass2"

# Secret for signing sessions (random string, e.g. `openssl rand -hex 32`)
AUTH_SECRET="..."

# Secret for the cron endpoint (e.g. `openssl rand -hex 24`)
CRON_SECRET="..."
```

### Environment variables

| Variable         | Description                                                    |
| ---------------- | ------------------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection (pooled) used by the application.          |
| `DIRECT_URL`     | Direct connection used by Prisma migrations.                   |
| `OPENAI_API_KEY` | Key for the `gpt-4o-mini` model.                               |
| `DEMO_USERS`     | Demo accounts in `login:password` format, comma-separated.     |
| `AUTH_SECRET`    | HMAC secret for signing the session cookie.                    |
| `CRON_SECRET`    | Bearer token protecting the `/api/cron/ingest` endpoint.       |

## Running locally

```bash
npm install                 # install + prisma generate (postinstall)
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # (optional) default Nexor profile
npm run dev                 # http://localhost:3000
```

Log in with one of the accounts from `DEMO_USERS`, pick a preset or enter your own profile, then fetch tenders with the **"Pobierz z e-Zamówień"** / **"Pobierz z TED (UE)"** buttons.

## Scripts

| Script                 | Action                                            |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Development server.                               |
| `npm run build`        | Production build.                                 |
| `npm run start`        | Run the production build.                         |
| `npm run lint`         | ESLint.                                           |
| `npm run vercel-build` | `prisma migrate deploy && next build` (Vercel).   |

## How ingestion works

- **Buttons** fetch the first page of results from a given source — a quick live preview.
- **Cron** (`GET /api/cron/ingest`, header `Authorization: Bearer $CRON_SECRET`) fetches the **next page** from both sources on each call, advancing a cursor stored in the `IngestState` table. Once it reaches the end it loops back to the first page to pick up new tenders. Duplicates are rejected by `externalId`.

### Scheduling (example: GitHub Actions)

`.github/workflows/ingest.yml` pings the endpoint every 15 minutes. Set these in the repository secrets:

- `CRON_SECRET` — the same value as in the app,
- `INGEST_URL` — e.g. `https://your-app.vercel.app/api/cron/ingest`.

Alternative without GitHub: [cron-job.org](https://cron-job.org) with the endpoint URL and an `Authorization: Bearer <CRON_SECRET>` header.

## Matching algorithm

`scoreTender(tender, profile)` awards points for:

- an exact CPV code match (+50) or a related one (same group, +15),
- a keyword in the title (+20) or description (+8),
- a matching region (+30).

The score is converted to a match percentage and drives sorting as well as the card color (high / medium / low).

## Deployment (Vercel + Neon)

1. Create a Neon database and copy the connection strings into `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
2. Add all environment variables in the Vercel project settings.
3. Vercel uses `vercel-build` (`prisma migrate deploy && next build`) to run migrations during deployment.
4. Configure a schedule (GitHub Actions or cron-job.org) pointing at `/api/cron/ingest`.

## Limitations (MVP)

- **One active search at a time** — a new/preset search overwrites the previous one; custom searches are not persisted.
- **Budget range** is saved and displayed but does not filter (sources don't provide amounts to the database).
- **AI analysis limit** is counted per demo account (3 by default), enforced server-side.
- TED's `PAGE_NUMBER` mode caps at 15,000 results per query (guarded by a cursor reset).
