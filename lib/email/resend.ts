import { Resend } from "resend";

import { getEnv } from "@/lib/env";

let resend: Resend | null = null;

function getResend() {
  const env = getEnv();

  if (!env.RESEND_API_KEY) {
    return null;
  }

  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const client = getResend();
  const env = getEnv();

  if (!client) {
    console.log("EMAIL_PREVIEW", input);
    return { id: "preview-email" };
  }

  return client.emails.send({
    from: env.EMAIL_FROM,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });
}
