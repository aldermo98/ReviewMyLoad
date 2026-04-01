type EmailTemplateInput = {
  businessName: string;
  customerName?: string | null;
  amountFormatted?: string;
  paymentUrl?: string;
  reviewUrl?: string;
  serviceType?: string;
};

export function paymentRequestCustomerEmail(input: EmailTemplateInput) {
  return {
    subject: `${input.businessName} sent your payment link`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:24px;margin:0 0 12px">Your payment link is ready</h1>
        <p style="line-height:1.6;margin:0 0 16px">Hi ${input.customerName ?? "there"},</p>
        <p style="line-height:1.6;margin:0 0 16px">${input.businessName} sent a secure Stripe payment link for your ${input.serviceType?.toLowerCase() ?? "service"}.</p>
        <p style="line-height:1.6;margin:0 0 24px">Amount due: <strong>${input.amountFormatted ?? ""}</strong></p>
        <a href="${input.paymentUrl}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:999px;font-weight:700">Pay securely</a>
      </div>
    `,
  };
}

export function paymentRequestMerchantEmail(input: EmailTemplateInput) {
  return {
    subject: `Payment request created for ${input.customerName ?? "customer"}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:24px;margin:0 0 12px">Payment request created</h1>
        <p style="line-height:1.6;margin:0 0 16px">A payment request for ${input.customerName ?? "your customer"} is live.</p>
        <p style="line-height:1.6;margin:0 0 16px">Amount: <strong>${input.amountFormatted ?? ""}</strong></p>
        <p style="line-height:1.6;margin:0">Shareable link: <a href="${input.paymentUrl}">${input.paymentUrl}</a></p>
      </div>
    `,
  };
}

export function paymentSucceededMerchantEmail(input: EmailTemplateInput) {
  return {
    subject: `${input.customerName ?? "A customer"} paid successfully`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:24px;margin:0 0 12px">Payment received</h1>
        <p style="line-height:1.6;margin:0 0 16px">${input.customerName ?? "Your customer"} has completed payment for ${input.serviceType?.toLowerCase() ?? "the job"}.</p>
        <p style="line-height:1.6;margin:0 0 16px">Amount paid: <strong>${input.amountFormatted ?? ""}</strong></p>
        <p style="line-height:1.6;margin:0">Hosted review page: <a href="${input.reviewUrl}">${input.reviewUrl}</a></p>
      </div>
    `,
  };
}
