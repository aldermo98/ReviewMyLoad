"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createJob,
  createPaymentRequest,
  getJobDetail,
  getIntegrationConnectionForOrganization,
  getPaymentRequestByToken,
  getPaymentRequestContextById,
  replaceReviewDestination,
  upsertIntegrationConnection,
  updateJob,
  updateOrganizationBusinessDetails,
  updatePaymentRequest,
  updateReviewGenerationsForPaymentRequest,
  upsertCustomerForOrganization,
  upsertPaymentByCheckoutSession,
} from "@/lib/data/app-data";
import { sendEmail } from "@/lib/email/resend";
import {
  paymentRequestCustomerEmail,
  paymentRequestMerchantEmail,
  paymentSucceededMerchantEmail,
} from "@/lib/email/templates";
import { requireOrganizationContext } from "@/lib/auth/session";
import { verifyGoHighLevelConnection } from "@/lib/crm/gohighlevel";
import { createPaymentCheckoutSession } from "@/lib/payments";
import { generateReviewForPaymentRequest } from "@/lib/reviews/generate-review";
import { absoluteUrl, formatCurrency } from "@/lib/utils";

export async function saveBusinessDetailsAction(formData: FormData) {
  const { organization } = await requireOrganizationContext();

  const businessName = String(formData.get("businessName") ?? "");
  const businessEmail = String(formData.get("businessEmail") ?? "");
  const city = String(formData.get("city") ?? "");
  const websiteUrl = String(formData.get("websiteUrl") ?? "");
  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "");

  await updateOrganizationBusinessDetails(organization.id, {
    businessName,
    businessEmail,
    city,
    websiteUrl,
    googleReviewUrl,
    onboardingStatus: "CRM_OPTIONAL",
  });

  await replaceReviewDestination(organization.id, googleReviewUrl);

  revalidatePath("/dashboard/onboarding");
  revalidatePath("/dashboard/settings");
}

export async function saveSettingsAction(formData: FormData) {
  const { organization } = await requireOrganizationContext();

  await updateOrganizationBusinessDetails(organization.id, {
    businessName: String(formData.get("businessName") ?? ""),
    googleReviewUrl: String(formData.get("googleReviewUrl") ?? ""),
    emailCustomerOnCreate: formData.get("emailCustomerOnCreate") === "on",
    emailMerchantOnCreate: formData.get("emailMerchantOnCreate") === "on",
    emailMerchantOnPaid: formData.get("emailMerchantOnPaid") === "on",
    brandPrimaryColor: String(formData.get("brandPrimaryColor") ?? "#0F766E"),
    brandAccentColor: String(formData.get("brandAccentColor") ?? "#F59E0B"),
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function connectGoHighLevelAction(formData: FormData) {
  const { organization } = await requireOrganizationContext();
  const locationId = String(formData.get("ghlLocationId") ?? "").trim();
  const privateIntegrationToken = String(formData.get("ghlPrivateIntegrationToken") ?? "").trim();

  if (!locationId || !privateIntegrationToken) {
    redirect("/dashboard/settings?crm=missing");
  }

  const verified = await verifyGoHighLevelConnection({
    locationId,
    privateIntegrationToken,
  });

  await upsertIntegrationConnection({
    organizationId: organization.id,
    type: "GHL",
    status: "CONNECTED",
    externalAccountId: verified.locationId,
    metadata: {
      provider: "gohighlevel",
      locationId: verified.locationId,
      locationName: verified.locationName,
      companyId: verified.companyId,
      email: verified.email,
      tokenLast4: verified.tokenLast4,
      encryptedToken: verified.encryptedToken,
      connectedAt: new Date().toISOString(),
      authMode: "private_integration_token",
      docsUrl: "https://marketplace.gohighlevel.com/docs/",
    },
  });

  await updateOrganizationBusinessDetails(organization.id, {
    onboardingStatus: organization.onboardingStatus === "STARTED" ? "CRM_OPTIONAL" : organization.onboardingStatus,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/onboarding");
  redirect("/dashboard/settings?crm=connected");
}

export async function disconnectGoHighLevelAction() {
  const { organization } = await requireOrganizationContext();
  const existing = await getIntegrationConnectionForOrganization(organization.id, "GHL");

  if (existing) {
    await upsertIntegrationConnection({
      organizationId: organization.id,
      type: "GHL",
      status: "DISCONNECTED",
      externalAccountId: null,
      metadata: null,
    });
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?crm=disconnected");
}

export async function finishOnboardingAction() {
  const { organization } = await requireOrganizationContext();

  await updateOrganizationBusinessDetails(organization.id, {
    onboardingStatus: "COMPLETE",
    onboardingCompletedAt: new Date().toISOString(),
  });

  redirect("/dashboard");
}

export async function createPaymentRequestAction(formData: FormData) {
  const { organization } = await requireOrganizationContext();

  const customerName = String(formData.get("customerName") ?? "");
  const customerEmail = String(formData.get("customerEmail") ?? "");
  const serviceType = String(formData.get("serviceType") ?? "");
  const city = String(formData.get("city") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const amountCents = Math.round(amount * 100);

  const customer = (await upsertCustomerForOrganization({
    organizationId: organization.id,
    email: customerEmail,
    name: customerName,
  })) as any;

  if (!customer) {
    throw new Error("Customer could not be created.");
  }

  const job = (await createJob({
    organizationId: organization.id,
    customerId: customer.id,
    serviceType,
    city,
    notes,
    amountCents,
    status: "SENT",
  })) as any;

  if (!job) {
    throw new Error("Job could not be created.");
  }

  const paymentRequest = (await createPaymentRequest({
    organizationId: organization.id,
    jobId: job.id,
    amountCents,
    status: "SENT",
    hostedReviewToken: crypto.randomBytes(18).toString("hex"),
  })) as any;

  if (!paymentRequest) {
    throw new Error("Payment request could not be created.");
  }

  const checkout = await createPaymentCheckoutSession(paymentRequest.id);
  const formattedAmount = formatCurrency(amountCents);

  if (organization.emailCustomerOnCreate) {
    const customerEmailTemplate = paymentRequestCustomerEmail({
      businessName: organization.businessName ?? organization.name,
      customerName,
      amountFormatted: formattedAmount,
      paymentUrl: checkout.url ?? "",
      serviceType,
    });

    await sendEmail({
      to: customerEmail,
      subject: customerEmailTemplate.subject,
      html: customerEmailTemplate.html,
    });
  }

  const updateData: { customerEmailSentAt?: string; merchantNotifiedAt?: string } = {
    customerEmailSentAt: new Date().toISOString(),
  };

  if (organization.emailMerchantOnCreate && organization.businessEmail) {
    const merchantEmailTemplate = paymentRequestMerchantEmail({
      businessName: organization.businessName ?? organization.name,
      customerName,
      amountFormatted: formattedAmount,
      paymentUrl: checkout.url ?? "",
      serviceType,
    });

    await sendEmail({
      to: organization.businessEmail,
      subject: merchantEmailTemplate.subject,
      html: merchantEmailTemplate.html,
    });

    updateData.merchantNotifiedAt = new Date().toISOString();
  }

  await updatePaymentRequest(paymentRequest.id, updateData);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/jobs");
  redirect(`/dashboard/jobs/${job.id}`);
}

export async function markReviewPostedAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const paymentRequest = await getPaymentRequestByToken(token);

  if (!paymentRequest) {
    return;
  }

  await updateReviewGenerationsForPaymentRequest(paymentRequest.id, {
    postedAt: new Date().toISOString(),
  });
}

export async function createDemoSuccessAction(paymentRequestId: string) {
  const paymentRequest = (await getPaymentRequestContextById(paymentRequestId)) as any;

  if (!paymentRequest) {
    throw new Error("Payment request not found.");
  }

  await updatePaymentRequest(paymentRequestId, { status: "PAID" });

  await upsertPaymentByCheckoutSession({
    organizationId: paymentRequest.organizationId,
    jobId: paymentRequest.jobId,
    paymentRequestId,
    amountCents: paymentRequest.amountCents,
    status: "SUCCEEDED",
    paidAt: new Date().toISOString(),
    rawStatus: "manual_success",
    stripeCheckoutSessionId: paymentRequest.stripeCheckoutSessionId ?? `manual-${paymentRequest.id}`,
  });

  await createOrUpdatePaidJob(paymentRequest.jobId);

  await generateReviewForPaymentRequest(paymentRequest.id);

  if (paymentRequest.organization.emailMerchantOnPaid && paymentRequest.organization.businessEmail) {
    const merchantEmailTemplate = paymentSucceededMerchantEmail({
      businessName: paymentRequest.organization.businessName ?? paymentRequest.organization.name,
      customerName: paymentRequest.job.customer.name,
      amountFormatted: formatCurrency(paymentRequest.amountCents),
      reviewUrl: absoluteUrl(`/review/${paymentRequest.hostedReviewToken}`),
      serviceType: paymentRequest.job.serviceType,
    });

    await sendEmail({
      to: paymentRequest.organization.businessEmail,
      subject: merchantEmailTemplate.subject,
      html: merchantEmailTemplate.html,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/jobs/${paymentRequest.jobId}`);
}

async function createOrUpdatePaidJob(jobId: string) {
  const job = await getJobDetail("", jobId);
  if (!job) return;

  await updateJob(jobId, {
    status: "PAID",
    completedAt: new Date().toISOString(),
  });
}
