import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  footer,
  children,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
      <Link href="/" className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-500">
        ReviewMyLoad
      </Link>
      <h1 className="mt-6 text-4xl font-black tracking-tight text-neutral-950">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
      <form action={action} className="mt-8 space-y-4">
        {children}
        <SubmitButton className="w-full">{submitLabel}</SubmitButton>
      </form>
      <div className="mt-6 text-sm text-neutral-600">{footer}</div>
    </div>
  );
}
