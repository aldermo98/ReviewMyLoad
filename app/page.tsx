import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Connect payments once",
    body: "Set up payouts once and keep the core product free by using the built-in payment flow.",
  },
  {
    title: "Send a payment link",
    body: "Create a job in under a minute, email the customer automatically, and share the checkout link anywhere.",
  },
  {
    title: "Turn payment into a review request",
    body: "After payment clears, customers land on a clean hosted page with an editable, service-aware review draft.",
  },
];

const benefits = [
  "Free when you use the built-in payment flow",
  "Simple payment links and simple review follow-up",
  "Editable drafts that sound human, not spammy",
  "Built for busy home service owners, not software people",
];

const faqs = [
  {
    q: "How is the core product free?",
    a: "Merchants use the platform for free when they process payments through the built-in payment flow. The platform earns through payments instead of charging a core monthly subscription.",
  },
  {
    q: "Do you post reviews automatically?",
    a: "No. Customers can edit the draft, copy it, and choose whether to post it to Google. The product never auto-posts reviews.",
  },
  {
    q: "Can I start without a CRM?",
    a: "Yes. The MVP supports manual job entry now, with a CRM adapter layer ready for future integrations like Jobber, GHL, and Housecall Pro.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-[#fcfcf9] text-neutral-950">
      <section className="border-b border-black/8">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.42em] text-neutral-500">
            ReviewMyLoad
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-neutral-500 md:flex">
            <a href="#how-it-works" className="transition hover:text-neutral-950">
              How it works
            </a>
            <a href="#benefits" className="transition hover:text-neutral-950">
              Benefits
            </a>
            <a href="#faq" className="transition hover:text-neutral-950">
              FAQ
            </a>
          </nav>
          <Link
            href="/sign-up"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:border-black/30"
          >
            Sign up free
          </Link>
        </header>
        <div className="mx-auto grid min-h-[calc(100svh-84px)] max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[var(--brand-accent)]">
              Free review automation for home service pros
            </p>
            <h1 className="mt-6 max-w-4xl text-6xl font-black leading-[0.92] tracking-[-0.05em] text-neutral-950 sm:text-7xl lg:text-[6.4rem]">
              Get paid.
              <br />
              Get reviews.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-neutral-600">
              Send one payment link. When the job is paid, your customer lands on a simple review page with an editable draft based on the real job.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white">
                Start free
                <ArrowRight className="size-4" />
              </Link>
              <p className="text-sm text-neutral-500">Free as long as you use our payment flow.</p>
            </div>
          </div>

          <div className="border-l border-black/8 pl-0 lg:pl-10">
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-neutral-950">1. Send payment</p>
                <p className="mt-2 text-sm leading-7 text-neutral-600">
                  Create a job and send a checkout link.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-950">2. Payment succeeds</p>
                <p className="mt-2 text-sm leading-7 text-neutral-600">
                  The payment confirms and the job is marked complete.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-950">3. Customer sees review page</p>
                <p className="mt-2 text-sm leading-7 text-neutral-600">
                  They can edit the draft, copy it, and choose whether to leave a Google review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-t border-black/8 pt-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-neutral-950">Simple enough to explain in a minute.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-neutral-600">
              The product is intentionally narrow: payments first, review follow-up second, no clutter in between.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title}>
                <p className="text-sm font-semibold text-[var(--brand-accent)]">0{index + 1}</p>
                <h3 className="mt-4 text-2xl font-bold text-neutral-950">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="border-y border-black/8">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">Why it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-neutral-950">Clear product. Clear value.</h2>
          </div>
          <div className="grid gap-5">
            {benefits.map((benefit) => (
              <div key={benefit} className="border-b border-black/8 pb-5">
                <p className="text-base leading-7 text-neutral-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-t border-black/8 pt-12 lg:grid-cols-3">
          {faqs.map((item) => (
            <div key={item.q}>
              <h3 className="text-lg font-bold text-neutral-950">{item.q}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-500">ReviewMyLoad</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              Free review automation powered by payments for junk removal, cleaning, landscaping, handyman, plumbing, HVAC, painting, and pressure washing businesses.
            </p>
          </div>
          <Link href="/sign-up" className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">
            Create your free account
          </Link>
        </div>
      </footer>
    </main>
  );
}
