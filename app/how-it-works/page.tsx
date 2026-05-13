import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "../brand-logo";

export const metadata: Metadata = {
  title: "How It Works | Lex Ventured & Co",
  description:
    "Learn how Lex Ventured & Co helps home sellers move from first conversation to closing with a clean, simple process.",
};

const contactDetails = {
  phone: "(833) 600-8355",
  phoneHref: "tel:+18336008355",
  email: "lex@bonillabuilding.com",
  emailHref: "mailto:lex@bonillabuilding.com",
};

const processSteps = [
  {
    step: "01",
    title: "Tell us about the property",
    body: "Share the address, your timeline, and what is making you consider selling. We do not expect a polished pitch.",
  },
  {
    step: "02",
    title: "Have a real conversation",
    body: "We talk through the condition, the situation, and whether a direct sale is a fit. No pressure and no confusing runaround.",
  },
  {
    step: "03",
    title: "Review a straightforward offer",
    body: "If it makes sense, we put together a clean next step so you can decide on your own timeline.",
  },
  {
    step: "04",
    title: "Close on terms that work",
    body: "Need speed, flexibility, or a little breathing room before moving? We structure the closing around that.",
  },
];

const reviewPoints = [
  "Property condition and repairs needed",
  "Your ideal timeline to close",
  "Occupancy, tenants, or inherited situations",
  "Anything that makes a traditional sale feel heavy",
];

const whySellersLikeIt = [
  "No repairs before you reach out",
  "No open houses or weekend showings",
  "Direct communication from the start",
  "A cleaner process when life already feels busy",
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f6f1_0%,#ece7dd_45%,#e3ddd1_100%)] text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 md:px-10">
        <header className="sticky top-0 z-20 mb-12 rounded-full border border-black/5 bg-white/75 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <BrandLogo compact className="scale-[0.95] origin-left" />
            <nav className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden text-sm font-medium text-neutral-600 sm:inline"
              >
                Home
              </Link>
              <Link
                href="/how-it-works"
                className="hidden text-sm font-medium text-neutral-900 sm:inline"
              >
                How It Works
              </Link>
              <a
                href={contactDetails.phoneHref}
                className="hidden text-sm font-medium text-neutral-600 md:inline"
              >
                {contactDetails.phone}
              </a>
              <a
                href={contactDetails.emailHref}
                className="hidden text-sm font-medium text-neutral-500 lg:inline"
              >
                {contactDetails.email}
              </a>
              <Link
                href="/#offer-form"
                className="text-sm font-medium text-neutral-600"
              >
                Get Offer
              </Link>
            </nav>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-neutral-500">
              How it works
            </p>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-[-0.04em] text-neutral-950 md:text-7xl">
              A simple process built for sellers who want clarity.
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-600 md:text-xl">
              If the house needs work, life is busy, or you just want to know
              your options, the process should still feel clean and easy to
              understand.
            </p>

            <div className="mt-8 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
                What we review
              </p>
              <div className="mt-4 grid gap-3">
                {reviewPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-black/8 bg-[#f8f5ee] px-4 py-3 text-sm text-neutral-700"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {processSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-[1.9rem] border border-black/10 bg-white/82 p-7 shadow-[0_18px_60px_rgba(0,0,0,0.05)]"
              >
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-400">
                  {item.step}
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                  {item.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2.25rem] border border-black/10 bg-white/85 p-8 shadow-[0_18px_55px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Why sellers like this better
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {whySellersLikeIt.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-black/8 bg-[#f8f5ee] px-4 py-4 text-sm text-neutral-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.25rem] bg-black px-8 py-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/55">
              Ready to start?
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Start with a simple conversation.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/75">
              Send the property details, call us directly, or email us if you
              want to talk through the situation first.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/78">
              <a href={contactDetails.phoneHref} className="font-medium text-white">
                {contactDetails.phone}
              </a>
              <a href={contactDetails.emailHref} className="text-white/80">
                {contactDetails.email}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#offer-form"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Request an Offer
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
