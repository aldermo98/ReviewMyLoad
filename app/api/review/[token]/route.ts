import { NextResponse } from "next/server";

import {
  getPaymentRequestByToken,
  updateReviewGenerationsForPaymentRequest,
} from "@/lib/data/app-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await request.json();

  const paymentRequest = await getPaymentRequestByToken(token);

  if (!paymentRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { copiedAt?: Date; customerEditedReview?: string } = {};

  if (body.copied) {
    data.copiedAt = new Date();
  }

  if (typeof body.customerEditedReview === "string") {
    data.customerEditedReview = body.customerEditedReview;
  }

  await updateReviewGenerationsForPaymentRequest(paymentRequest.id, data);

  return NextResponse.json({ ok: true });
}
