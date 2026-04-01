import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "owner@demo.reviewmyload.com" },
    update: {},
    create: {
      email: "owner@demo.reviewmyload.com",
      passwordHash,
      fullName: "Demo Owner",
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "demo-junk-co" },
    update: {
      onboardingStatus: "COMPLETE",
      businessName: "Demo Junk Co.",
      googleReviewUrl: "https://g.page/r/demo/review",
    },
    create: {
      slug: "demo-junk-co",
      name: "Demo Junk Co.",
      businessName: "Demo Junk Co.",
      city: "Sacramento",
      googleReviewUrl: "https://g.page/r/demo/review",
      onboardingStatus: "COMPLETE",
      businessEmail: "hello@demojunkco.com",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
    },
  });

  await prisma.stripeAccount.upsert({
    where: { organizationId: organization.id },
    update: {
      stripeAccountId: "acct_demo123456789",
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    },
    create: {
      organizationId: organization.id,
      stripeAccountId: "acct_demo123456789",
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: "jamie@example.com",
      },
    },
    update: {
      name: "Jamie Carter",
    },
    create: {
      organizationId: organization.id,
      name: "Jamie Carter",
      email: "jamie@example.com",
    },
  });

  const job = await prisma.job.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      serviceType: "Junk removal",
      city: "Sacramento",
      notes: "Crew removed an old sectional, two mattresses, and cleaned up the garage floor afterward.",
      amountCents: 32500,
      status: "PAID",
      completedAt: new Date(),
    },
  });

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      organizationId: organization.id,
      jobId: job.id,
      amountCents: 32500,
      status: "PAID",
      shareableUrl: "https://checkout.stripe.com/demo",
      hostedReviewToken: "demo-review-token",
      customerEmailSentAt: new Date(),
      merchantNotifiedAt: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: organization.id,
      jobId: job.id,
      paymentRequestId: paymentRequest.id,
      amountCents: 32500,
      status: "SUCCEEDED",
      currency: "usd",
      paidAt: new Date(),
      stripeCheckoutSessionId: "cs_test_demo_123",
      stripePaymentIntentId: "pi_test_demo_123",
      rawStatus: "paid",
    },
  });

  await prisma.reviewGeneration.create({
    data: {
      organizationId: organization.id,
      jobId: job.id,
      paymentRequestId: paymentRequest.id,
      status: "READY",
      sourceModel: "gpt-4.1-mini",
      promptVersion: "2026-03-30",
      confidence: 0.91,
      flags: [],
      shortReview: "Fast, careful junk removal with great cleanup.",
      reviewDraft:
        "I used Demo Junk Co. for a garage junk removal job in Sacramento, and the whole experience felt easy from start to finish. They showed up when they said they would, worked quickly, and took extra care moving a bulky sectional and two mattresses out without making a mess. What stood out most was how clean the garage looked when they finished. I would absolutely use them again and would recommend them if you want a team that is efficient, respectful, and thorough.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
