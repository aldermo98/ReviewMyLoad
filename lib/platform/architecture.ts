export const architectureNotes = {
  backend: [
    "Supabase Auth is the identity layer for web now and Flutter later.",
    "Supabase Postgres is the system of record for business data.",
    "Prisma remains as a typed data mapper against Supabase Postgres during the MVP.",
    "Stripe, OpenAI, and email logic should continue moving toward edge-safe service boundaries.",
  ],
  mobile: [
    "Flutter can reuse Supabase Auth directly.",
    "Flutter can read and write the same organization, job, payment, and review records.",
    "The web app should avoid hiding core business rules inside page components.",
  ],
} as const;
