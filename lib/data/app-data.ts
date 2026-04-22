import crypto from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Row = Record<string, any>;

function cuidLike(prefix = "") {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
}

function withTimestamps<T extends Row>(input: T) {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function withUpdatedAt<T extends Row>(input: T) {
  return {
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

function withCreatedAt<T extends Row>(input: T) {
  return {
    createdAt: new Date().toISOString(),
    ...input,
  };
}

async function one<T = Row>(query: PromiseLike<{ data: T | null; error: any }>) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? "Supabase query failed");
  }

  return data;
}

async function many<T = Row>(query: PromiseLike<{ data: T[] | null; error: any }>) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? "Supabase query failed");
  }

  return data ?? [];
}

export async function findAppUserByIdentity(input: {
  email?: string | null;
  supabaseUserId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();

  if (input.supabaseUserId) {
    const userBySupabase = await one<Row>(
      supabase.from("User").select("*").eq("supabaseUserId", input.supabaseUserId).maybeSingle(),
    );

    if (userBySupabase) return userBySupabase;
  }

  if (!input.email) return null;

  return one<Row>(supabase.from("User").select("*").eq("email", input.email).maybeSingle());
}

export async function createAppUserWithOrganization(input: {
  email: string;
  fullName?: string | null;
  businessName: string;
  supabaseUserId?: string | null;
  onboardingStatus?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const userId = cuidLike("usr_");
  const organizationId = cuidLike("org_");

  await one(
    supabase.from("User").insert(withTimestamps({
      id: userId,
      email: input.email,
      fullName: input.fullName ?? null,
      supabaseUserId: input.supabaseUserId ?? null,
      passwordHash: "managed-by-supabase-auth",
    })),
  );

  await one(
    supabase.from("Organization").insert(withTimestamps({
      id: organizationId,
      slug: `${input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.businessName,
      businessName: input.businessName,
      onboardingStatus: input.onboardingStatus ?? "STARTED",
    })),
  );

  await one(
    supabase.from("Membership").insert(withCreatedAt({
      id: cuidLike("mem_"),
      userId,
      organizationId,
      role: "OWNER",
    })),
  );

  // This placeholder connection is helpful for the dashboard, but sign-up
  // should still succeed if an older database doesn't yet match this table.
  try {
    await one(
      supabase.from("IntegrationConnection").insert(withTimestamps({
        id: cuidLike("int_"),
        organizationId,
        type: "MANUAL",
        status: "CONNECTED",
      })),
    );
  } catch {
    // Ignore optional CRM placeholder creation errors during onboarding.
  }

  return { userId, organizationId };
}

export async function getOrganizationContextByIdentity(input: {
  email?: string | null;
  supabaseUserId?: string | null;
}) {
  const user = await findAppUserByIdentity(input);

  if (!user) return null;

  const supabase = getSupabaseAdminClient();
  const membership = await one<Row>(
    supabase
      .from("Membership")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: true })
      .limit(1)
      .maybeSingle(),
  );

  if (!membership) {
    return { user, membership: null, organization: null };
  }

  const [organization, stripeAccount, reviewDestinations, integrationConnections] = await Promise.all([
    one<Row>(supabase.from("Organization").select("*").eq("id", membership.organizationId).single()),
    one<Row>(
      supabase.from("StripeAccount").select("*").eq("organizationId", membership.organizationId).maybeSingle(),
    ),
    many<Row>(
      supabase.from("ReviewDestination").select("*").eq("organizationId", membership.organizationId),
    ),
    many<Row>(
      supabase.from("IntegrationConnection").select("*").eq("organizationId", membership.organizationId),
    ),
  ]);

  return {
    user,
    membership,
    organization: {
      ...organization,
      paymentProvider: stripeAccount ? "stripe" : null,
      paymentProviderAccount: stripeAccount
        ? {
            ...stripeAccount,
            provider: "stripe",
            providerAccountId: stripeAccount.stripeAccountId,
          }
        : null,
      stripeAccount,
      reviewDestinations,
      integrationConnections,
    },
  };
}

export async function updateOrganizationBusinessDetails(organizationId: string, input: Row) {
  const supabase = getSupabaseAdminClient();

  await one(
    supabase
      .from("Organization")
      .update(withUpdatedAt(input))
      .eq("id", organizationId),
  );
}

export async function replaceReviewDestination(organizationId: string, url: string) {
  const supabase = getSupabaseAdminClient();

  await one(supabase.from("ReviewDestination").delete().eq("organizationId", organizationId));

  if (!url) return;

  await one(
    supabase.from("ReviewDestination").insert(withTimestamps({
      id: cuidLike("revdest_"),
      organizationId,
      type: "GOOGLE",
      label: "Google Business Profile",
      url,
      isDefault: true,
    })),
  );
}

export async function getStripeAccountForOrganization(organizationId: string) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase.from("StripeAccount").select("*").eq("organizationId", organizationId).maybeSingle(),
  );
}

export async function getIntegrationConnectionForOrganization(
  organizationId: string,
  type: "GHL" | "JOBBER" | "HOUSECALL_PRO" | "MANUAL",
) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase
      .from("IntegrationConnection")
      .select("*")
      .eq("organizationId", organizationId)
      .eq("type", type)
      .maybeSingle(),
  );
}

export async function upsertIntegrationConnection(input: {
  organizationId: string;
  type: "GHL" | "JOBBER" | "HOUSECALL_PRO" | "MANUAL";
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  externalAccountId?: string | null;
  metadata?: Row | null;
}) {
  const supabase = getSupabaseAdminClient();
  const existing = await getIntegrationConnectionForOrganization(input.organizationId, input.type);

  if (existing) {
    return one<Row>(
      supabase
        .from("IntegrationConnection")
        .update(withUpdatedAt({
          status: input.status,
          externalAccountId: input.externalAccountId ?? null,
          metadata: input.metadata ?? null,
        }))
        .eq("id", existing.id)
        .select()
        .single(),
    );
  }

  return one<Row>(
    supabase
      .from("IntegrationConnection")
      .insert(withTimestamps({
        id: cuidLike("int_"),
        organizationId: input.organizationId,
        type: input.type,
        status: input.status,
        externalAccountId: input.externalAccountId ?? null,
        metadata: input.metadata ?? null,
      }))
      .select()
      .single(),
  );
}

export async function createStripeAccountRecord(input: Row) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase
      .from("StripeAccount")
      .insert(withTimestamps({
        id: cuidLike("sa_"),
        ...input,
      }))
      .select()
      .single(),
  );
}

export async function updateStripeAccountById(id: string, input: Row) {
  const supabase = getSupabaseAdminClient();
  await one(supabase.from("StripeAccount").update(withUpdatedAt(input)).eq("id", id));
}

export async function updateStripeAccountByStripeId(stripeAccountId: string, input: Row) {
  const supabase = getSupabaseAdminClient();
  await one(
    supabase.from("StripeAccount").update(withUpdatedAt(input)).eq("stripeAccountId", stripeAccountId),
  );
}

export async function getOrganizationById(organizationId: string) {
  const supabase = getSupabaseAdminClient();
  return one<Row>(supabase.from("Organization").select("*").eq("id", organizationId).single());
}

export async function upsertCustomerForOrganization(input: {
  organizationId: string;
  email: string;
  name: string;
}) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase
      .from("Customer")
      .upsert(
        withTimestamps({
          id: cuidLike("cus_"),
          organizationId: input.organizationId,
          email: input.email,
          name: input.name,
        }),
        { onConflict: "organizationId,email" },
      )
      .select()
      .single(),
  );
}

export async function createJob(input: Row) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase
      .from("Job")
      .insert(withTimestamps({
        id: cuidLike("job_"),
        ...input,
      }))
      .select()
      .single(),
  );
}

export async function updateJob(jobId: string, input: Row) {
  const supabase = getSupabaseAdminClient();
  await one(supabase.from("Job").update(withUpdatedAt(input)).eq("id", jobId));
}

export async function createPaymentRequest(input: Row) {
  const supabase = getSupabaseAdminClient();

  return one<Row>(
    supabase
      .from("PaymentRequest")
      .insert(withTimestamps({
        id: cuidLike("pr_"),
        ...input,
      }))
      .select()
      .single(),
  );
}

export async function updatePaymentRequest(id: string, input: Row) {
  const supabase = getSupabaseAdminClient();
  await one(supabase.from("PaymentRequest").update(withUpdatedAt(input)).eq("id", id));
}

export async function getPaymentRequestContextById(paymentRequestId: string) {
  const supabase = getSupabaseAdminClient();
  const paymentRequest = await one<Row>(
    supabase.from("PaymentRequest").select("*").eq("id", paymentRequestId).single(),
  );

  if (!paymentRequest) {
    return null;
  }

  const [organization, stripeAccount, job, customer] = await Promise.all([
    getOrganizationById(paymentRequest.organizationId),
    getStripeAccountForOrganization(paymentRequest.organizationId),
    one<Row>(supabase.from("Job").select("*").eq("id", paymentRequest.jobId).single()),
    (async () => {
      const jobRow = await one<Row>(supabase.from("Job").select("*").eq("id", paymentRequest.jobId).single());
      if (!jobRow) return null;
      return one<Row>(supabase.from("Customer").select("*").eq("id", jobRow.customerId).single());
    })(),
  ]);

  return {
    ...paymentRequest,
    organization: {
      ...organization,
      paymentProvider: stripeAccount ? "stripe" : null,
      paymentProviderAccount: stripeAccount
        ? {
            ...stripeAccount,
            provider: "stripe",
            providerAccountId: stripeAccount.stripeAccountId,
          }
        : null,
      stripeAccount,
    },
    job: {
      ...job,
      customer,
    },
  };
}

export async function getPaymentRequestByToken(token: string) {
  const supabase = getSupabaseAdminClient();
  return one<Row>(
    supabase.from("PaymentRequest").select("*").eq("hostedReviewToken", token).maybeSingle(),
  );
}

export async function getLatestReviewGenerationForPaymentRequest(paymentRequestId: string) {
  const supabase = getSupabaseAdminClient();
  return one<Row>(
    supabase
      .from("ReviewGeneration")
      .select("*")
      .eq("paymentRequestId", paymentRequestId)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

export async function createReviewGeneration(input: Row) {
  const supabase = getSupabaseAdminClient();
  return one<Row>(
    supabase
      .from("ReviewGeneration")
      .insert(withTimestamps({
        id: cuidLike("rg_"),
        ...input,
      }))
      .select()
      .single(),
  );
}

export async function updateReviewGenerationsForPaymentRequest(paymentRequestId: string, input: Row) {
  const supabase = getSupabaseAdminClient();
  await one(
    supabase
      .from("ReviewGeneration")
      .update(withUpdatedAt(input))
      .eq("paymentRequestId", paymentRequestId),
  );
}

export async function getDashboardStats(organizationId: string) {
  const supabase = getSupabaseAdminClient();

  const [payments, paymentRequests, reviewGenerations, jobs, customers] = await Promise.all([
    many<Row>(supabase.from("Payment").select("*").eq("organizationId", organizationId)),
    many<Row>(supabase.from("PaymentRequest").select("*").eq("organizationId", organizationId)),
    many<Row>(supabase.from("ReviewGeneration").select("*").eq("organizationId", organizationId)),
    many<Row>(
      supabase.from("Job").select("*").eq("organizationId", organizationId).order("createdAt", { ascending: false }).limit(12),
    ),
    many<Row>(supabase.from("Customer").select("*").eq("organizationId", organizationId)),
  ]);

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const paymentsByJob = new Map<string, Row>();
  const requestsByJob = new Map<string, Row>();
  const reviewsByJob = new Map<string, Row>();

  payments
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .forEach((payment) => {
      if (!paymentsByJob.has(payment.jobId)) paymentsByJob.set(payment.jobId, payment);
    });

  paymentRequests
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .forEach((paymentRequest) => {
      if (!requestsByJob.has(paymentRequest.jobId)) requestsByJob.set(paymentRequest.jobId, paymentRequest);
    });

  reviewGenerations
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .forEach((review) => {
      if (!reviewsByJob.has(review.jobId)) reviewsByJob.set(review.jobId, review);
    });

  return {
    totalPayments: payments
      .filter((payment) => payment.status === "SUCCEEDED")
      .reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0),
    reviewRequests: paymentRequests.length,
    completedReviews: reviewGenerations.filter((review) => review.copiedAt || review.postedAt).length,
    paidJobs: payments.filter((payment) => payment.status === "SUCCEEDED").length,
    recentJobs: jobs.map((job) => ({
      ...job,
      customer: customerMap.get(job.customerId),
      paymentRequests: requestsByJob.get(job.id) ? [requestsByJob.get(job.id)] : [],
      reviewGenerations: reviewsByJob.get(job.id) ? [reviewsByJob.get(job.id)] : [],
      payments: paymentsByJob.get(job.id) ? [paymentsByJob.get(job.id)] : [],
    })),
  };
}

export async function getJobsForOrganization(organizationId: string) {
  const supabase = getSupabaseAdminClient();
  const [jobs, customers, paymentRequests, payments, reviewGenerations] = await Promise.all([
    many<Row>(supabase.from("Job").select("*").eq("organizationId", organizationId).order("createdAt", { ascending: false })),
    many<Row>(supabase.from("Customer").select("*").eq("organizationId", organizationId)),
    many<Row>(supabase.from("PaymentRequest").select("*").eq("organizationId", organizationId)),
    many<Row>(supabase.from("Payment").select("*").eq("organizationId", organizationId)),
    many<Row>(supabase.from("ReviewGeneration").select("*").eq("organizationId", organizationId)),
  ]);

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return jobs.map((job) => ({
    ...job,
    customer: customerMap.get(job.customerId),
    paymentRequests: paymentRequests.filter((request) => request.jobId === job.id).slice(0, 1),
    payments: payments.filter((payment) => payment.jobId === job.id).slice(0, 1),
    reviewGenerations: reviewGenerations.filter((review) => review.jobId === job.id).slice(0, 1),
  }));
}

export async function getJobDetail(organizationId: string, jobId: string) {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from("Job").select("*").eq("id", jobId);

  if (organizationId) {
    query = query.eq("organizationId", organizationId);
  }

  const job = await one<Row>(query.maybeSingle());

  if (!job) return null;

  const [customer, paymentRequests, payments, reviewGenerations] = await Promise.all([
    one<Row>(supabase.from("Customer").select("*").eq("id", job.customerId).single()),
    many<Row>(supabase.from("PaymentRequest").select("*").eq("jobId", job.id).order("createdAt", { ascending: false })),
    many<Row>(supabase.from("Payment").select("*").eq("jobId", job.id).order("createdAt", { ascending: false })),
    many<Row>(supabase.from("ReviewGeneration").select("*").eq("jobId", job.id).order("createdAt", { ascending: false })),
  ]);

  return {
    ...job,
    customer,
    paymentRequests,
    payments,
    reviewGenerations,
  };
}

export async function getPublicReviewPageData(token: string) {
  const paymentRequest = await getPaymentRequestByToken(token);
  if (!paymentRequest) return null;

  const supabase = getSupabaseAdminClient();
  const [organization, job, review] = await Promise.all([
    getOrganizationById(paymentRequest.organizationId),
    one<Row>(supabase.from("Job").select("*").eq("id", paymentRequest.jobId).single()),
    getLatestReviewGenerationForPaymentRequest(paymentRequest.id),
  ]);

  return {
    paymentRequest,
    organization,
    job,
    review,
  };
}

export async function getOrCreateWebhookEvent(stripeEventId: string, payload: Row) {
  const supabase = getSupabaseAdminClient();
  const existing = await one<Row>(
    supabase.from("WebhookEvent").select("*").eq("stripeEventId", stripeEventId).maybeSingle(),
  );

  if (existing) {
    await one(
      supabase
        .from("WebhookEvent")
        .update({ payload })
        .eq("stripeEventId", stripeEventId),
    );
    return existing;
  }

  return one<Row>(
    supabase
      .from("WebhookEvent")
      .insert(withCreatedAt({
        id: cuidLike("wh_"),
        stripeEventId,
        type: payload.type,
        livemode: payload.livemode ?? false,
        payload,
      }))
      .select()
      .single(),
  );
}

export async function markWebhookProcessed(stripeEventId: string) {
  const supabase = getSupabaseAdminClient();
  await one(
    supabase
      .from("WebhookEvent")
      .update({ processedAt: new Date().toISOString() })
      .eq("stripeEventId", stripeEventId),
  );
}

export async function upsertPaymentByCheckoutSession(input: Row) {
  const supabase = getSupabaseAdminClient();
  return one<Row>(
    supabase
      .from("Payment")
      .upsert(
        withTimestamps({
          id: input.id ?? cuidLike("pay_"),
          ...input,
        }),
        { onConflict: "stripeCheckoutSessionId" },
      )
      .select()
      .single(),
  );
}
