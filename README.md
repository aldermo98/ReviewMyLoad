# ReviewMyLoad MVP

ReviewMyLoad is a production-minded MVP for home service businesses that want to collect payment and turn completed jobs into clean, editable review requests.

## Product shape

- Free for merchants when they use the platform payment flow
- Embedded checkout plus connected-account onboarding
- Multi-tenant organizations from day one
- Manual job entry first, with a clean CRM adapter seam for later
- OpenAI Responses API for natural review draft generation
- Resend-backed transactional email flow with a console preview fallback
- Supabase Auth for identity across web and future Flutter clients
- Supabase Postgres for app data

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Stripe as the first payment provider implementation
- OpenAI
- Resend
- Prisma only remains as a temporary migration/seed tool, not as the app runtime data layer

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in Supabase, Stripe, OpenAI, and Resend credentials.
3. Point `DATABASE_URL` and `DIRECT_URL` at your Supabase Postgres connection string.
4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm run dev
```

## Auth setup

- Sign-up and sign-in now use Supabase Auth.
- Create your first account through the app after setting the Supabase keys.
- Identity is owned by Supabase.

## Architecture direction

- Next.js handles the web UI.
- Supabase Auth handles identity.
- Supabase Postgres holds the application data.
- The runtime app data layer now goes through Supabase clients and repositories.
- This keeps the app simple now while staying friendly to a later Flutter client.

See [supabase/README.md](/C:/Users/moren/OneDrive/Documents/Projects/ReviewMyLoad/supabase/README.md).

## Stripe notes

- `app/api/payments/connect/route.ts` starts merchant payments onboarding.
- `app/api/stripe/webhooks/route.ts` is the current Stripe-backed source of truth for payment success.
- The dashboard also includes a local demo success action so you can verify the review generation flow before wiring live webhooks.
- Checkout sessions use application fees plus destination transfers so the core business model stays payment-powered.

## Review generation notes

- Review output is JSON-structured.
- Drafts are first-person, service-aware, and editable.
- The app never auto-posts reviews.
- City is constrained to a single mention at most.
- Pricing is excluded unless it appears in notes.

## Email notes

- If `RESEND_API_KEY` is missing, emails are logged to the console in preview mode.
- Customer payment emails, merchant request confirmations, and paid notifications all use clean HTML templates.

## Key directories

- `app/` routes, layouts, server actions, and API endpoints
- `components/` shared UI pieces
- `lib/auth` Supabase-backed organization context
- `lib/payments` payment provider abstraction plus the Stripe Connect implementation
- `lib/reviews` OpenAI review generation service
- `lib/email` transactional email wrappers and templates
- `lib/data` Supabase-backed application data layer
- `lib/supabase` Supabase server, middleware, and admin clients
- `lib/crm` future adapter contract
- `prisma/` legacy migration/seed artifacts to remove in a later cleanup

## MVP tradeoffs

- Authentication now depends on Supabase configuration being present.
- The app runtime no longer depends on Prisma, but the repository still contains migration-era Prisma files that can be removed in a follow-up cleanup.
- Team roles beyond owner are out of scope.
- CRM sync is a placeholder seam, not a live integration.
- White-labeling and SMS are intentionally deferred.

## Suggested next steps

1. Add stronger field-level validation and user-facing error toasts.
2. Replace the demo payment success action with a local Stripe CLI webhook workflow.
3. Add organization switching if you plan to support agencies or multi-brand operators.
4. Introduce background jobs for review generation retries and outbound email retry logic.
