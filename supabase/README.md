# Supabase-first direction

This project is moving toward a Supabase-first architecture:

- Supabase Auth for identity across web and future Flutter clients
- Supabase Postgres as the system of record
- Prisma as the typed data layer against Supabase Postgres during the MVP
- Stripe, OpenAI, and email logic ready to move into Supabase Edge Functions as the product matures

## Why this helps

- One auth system for web and mobile
- One database for both Next.js and Flutter
- Cleaner separation between UI and core business logic
- Easier long-term move from web-only MVP to multi-client product

## Near-term next moves

1. Add Supabase SQL migrations for RLS around organizations and memberships.
2. Move Stripe webhook handling into a Supabase Edge Function.
3. Move review generation and email fan-out into edge-safe background jobs.
4. Replace direct page-owned mutations with repository/service modules shared across web and mobile.
