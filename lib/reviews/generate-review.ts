import OpenAI from "openai";

import {
  createReviewGeneration,
  getLatestReviewGenerationForPaymentRequest,
  getPaymentRequestContextById,
} from "@/lib/data/app-data";
import { getEnv } from "@/lib/env";
import { reviewJsonSchema } from "@/lib/reviews/schema";

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    return null;
  }

  openaiClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openaiClient;
}

function buildPrompt(input: {
  serviceType?: string | null;
  city?: string | null;
  notes?: string | null;
  businessName?: string | null;
}) {
  return [
    "You write helpful, believable customer review drafts for home service businesses.",
    "Write in first person and sound like a real customer.",
    "Make the draft 70 to 140 words.",
    "Mention the city at most once, and only if provided.",
    "Mention the service performed when available.",
    "Never use emojis, hashtags, keyword stuffing, robotic phrasing, or fake claims.",
    "Never mention price unless the notes explicitly mention price.",
    "Keep the tone specific, calm, and useful.",
    "Return JSON matching the schema exactly.",
    "",
    `businessName: ${input.businessName ?? ""}`,
    `serviceType: ${input.serviceType ?? ""}`,
    `city: ${input.city ?? ""}`,
    `notes: ${input.notes ?? ""}`,
  ].join("\n");
}

export async function generateReviewForPaymentRequest(paymentRequestId: string) {
  const paymentRequest = (await getPaymentRequestContextById(paymentRequestId)) as any;

  const existing = (await getLatestReviewGenerationForPaymentRequest(paymentRequestId)) as any;

  if (existing && existing.status === "READY") {
    return existing;
  }

  const openai = getOpenAI();

  if (!openai) {
    return createReviewGeneration({
      organizationId: paymentRequest.organizationId,
      jobId: paymentRequest.jobId,
      paymentRequestId,
      status: "READY",
      sourceModel: "fallback-template",
      promptVersion: "2026-03-30",
      confidence: 0.42,
      flags: ["OPENAI_NOT_CONFIGURED"],
      shortReview: `Smooth ${paymentRequest.job.serviceType.toLowerCase()} experience`,
      reviewDraft: `I had a really good experience with ${paymentRequest.organization.businessName ?? paymentRequest.organization.name} for ${paymentRequest.job.serviceType.toLowerCase()}. The team was easy to work with, communicated clearly, and handled the job with care. I appreciated that the work felt organized and professional from payment through completion. I would be comfortable recommending them to anyone who wants a reliable home service company.`,
    });
  }

  const response = await openai.responses.create({
    model: getEnv().OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Generate natural customer review drafts for real completed home service jobs.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildPrompt({
              businessName: paymentRequest.organization.businessName ?? paymentRequest.organization.name,
              serviceType: paymentRequest.job.serviceType,
              city: paymentRequest.job.city,
              notes: paymentRequest.job.notes,
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        ...reviewJsonSchema,
      },
    },
  });

  const parsed = JSON.parse(response.output_text);

  return createReviewGeneration({
    organizationId: paymentRequest.organizationId,
    jobId: paymentRequest.jobId,
    paymentRequestId,
    status: "READY",
    sourceModel: getEnv().OPENAI_MODEL,
    promptVersion: "2026-03-30",
    reviewDraft: parsed.reviewDraft,
    shortReview: parsed.shortReview,
    confidence: parsed.confidence,
    flags: parsed.flags,
  });
}
