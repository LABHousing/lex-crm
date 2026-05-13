import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "./brand-logo";
import SellerLeadForm from "./seller-lead-form";

export const metadata: Metadata = {
  title: "Lex Ventured & Co",
  description:
    "Sell your house without repairs, open houses, or pressure. Request a direct conversation and cash offer from Lex Ventured & Co.",
};

const sellerReasons = [
  "Inherited property",
  "Repairs feel overwhelming",
  "Tired landlord situation",
  "Need a faster sale",
];

const sellerSituations = [
  "Vacant or inherited property",
  "Tenant issues or deferred maintenance",
  "Storm, water, or fire damage",
  "You need speed, privacy, and clarity",
];

const processSteps = [
  {
    title: "Share the basics",
    description:
      "Tell us about the property, your timeline, and what is making you consider selling.",
  },
  {
    title: "Get a real conversation",
    description:
      "We review the property and talk through the cleanest path forward for your situation.",
  },
  {
    title: "Close on your terms",
    description:
      "Move fast if you need speed or choose a timeline that gives you breathing room.",
  },
];

const trustPoints = [
  "No repairs or cleaning before you talk with us",
  "No commissions or surprise fees",
  "Straightforward communication and flexible timing",
];

const offerHighlights = [
  {
    label: "Condition",
    value: "Any shape",
    note: "From clean updates to major cleanup jobs.",
  },
  {
    label: "Timeline",
    value: "Your pace",
    note: "Move fast or take time to think through options.",
  },
  {
    label: "Conversation",
    value: "Direct",
    note: "No pressure, just a real next step.",
  },
];

const detailCards = [
  {
    title: "As-is means as-is",
    body: "You do not need to repaint, clean out debris, or finish every project before reaching out.",
  },
  {
    title: "Flexible timing",
    body: "Need to move fast or need extra time to figure out your next step? We can talk through both.",
  },
  {
    title: "Clear communication",
    body: "No hard pitch. No confusing process. Just honest conversations about price, timeline, and fit.",
  },
  {
    title: "Seller-first approach",
    body: "The goal is to help you understand your options and move forward with less stress.",
  },
];

const pageImages = {
  renovatedBath: "/uploads/img-0402.jpg",
  distressedStairwell: "/uploads/img-1439-final.jpg",
  refreshedKitchen: "/uploads/img-9707-final.jpg",
  damagedPorch: "/uploads/img-1595-fixed.jpg",
};

const contactDetails = {
  phone: "(833) 600-8355",
  phoneHref: "tel:+18336008355",
  email: "lex@bonillabuilding.com",
  emailHref: "mailto:lex@bonillabuilding.com",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f6f1_0%,#ece7dd_45%,#e3ddd1_100%)] text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 md:px-10">
        <header className="sticky top-0 z-20 mb-10 rounded-full border border-black/5 bg-white/75 px-5 py-3 backdrop-blur">
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
                className="hidden text-sm font-medium text-neutral-600 sm:inline"
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
                href="#offer-form"
                className="text-sm font-medium text-neutral-600"
              >
                Get Offer
              </Link>
            </nav>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <BrandLogo className="mb-6 items-start" />
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-neutral-500">
              A cleaner path for home sellers
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-neutral-950 md:text-7xl">
              Sell the house in its current condition and skip the usual chaos.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600 md:text-xl">
              Whether the property is cleaned up, half-finished, inherited, or
              needs major work, we make the first conversation simple. Tell us
              what is going on and we will talk through a clear next step with
              no pressure.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {sellerReasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm text-neutral-700 backdrop-blur"
                >
                  {reason}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {sellerSituations.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-black/8 bg-white/65 px-4 py-3 text-sm text-neutral-700"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
                >
                  <p className="text-sm leading-6 text-neutral-700">{point}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
              <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/70 shadow-[0_20px_70px_rgba(0,0,0,0.06)]">
                <img
                  src={pageImages.renovatedBath}
                  alt="Updated bathroom renovation"
                  className="h-72 w-full object-cover"
                />
              </div>
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 shadow-[0_20px_70px_rgba(0,0,0,0.05)]">
                <img
                  src={pageImages.refreshedKitchen}
                  alt="Fresh kitchen cabinets and finishes"
                  className="h-36 w-full -rotate-90 scale-[1.45] object-cover"
                />
                </div>
                <div className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)]">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-400">
                    Real-world seller focus
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    We buy houses people are proud of and houses people are
                    overwhelmed by. The point is making it easier to move
                    forward either way.
                  </p>
                </div>
              </div>
            </div>
          </div>

            <div
            id="offer-form"
            className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-8"
          >
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
                Request your offer
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">
                Tell us about the property.
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                We built this for sellers who want a fast, simple conversation,
                honest feedback, and a clean option without fixing everything
                first.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-600">
                <a
                  href={contactDetails.phoneHref}
                  className="font-medium text-neutral-800"
                >
                  {contactDetails.phone}
                </a>
                <a
                  href={contactDetails.emailHref}
                  className="text-neutral-700"
                >
                  {contactDetails.email}
                </a>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {offerHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-black/8 bg-[#f6f1e7] px-4 py-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-neutral-950">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-neutral-600">
                    {item.note}
                  </div>
                </div>
              ))}
            </div>

            <SellerLeadForm />
          </div>
        </div>
      </section>

      <section className="border-y border-black/6 bg-white/65">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 md:px-10 lg:grid-cols-3">
          {processSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[1.75rem] border border-black/10 bg-white/85 p-8 shadow-[0_20px_70px_rgba(0,0,0,0.05)]"
            >
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-400">
                0{index + 1}
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
                {step.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-neutral-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Built for real situations
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-5xl">
              Some sellers have a clean property. Some sellers have a real mess.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-neutral-600">
              That is exactly why the page should feel honest. We work with
              updated properties, partial rehabs, water-damaged rooms, clutter,
              and inherited situations where the owner just wants clarity.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/75 shadow-[0_20px_70px_rgba(0,0,0,0.05)]">
                <img
                  src={pageImages.distressedStairwell}
                  alt="Property needing cleanup and repair"
                  className="h-80 w-full -rotate-90 scale-[1.3] object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/75 shadow-[0_20px_70px_rgba(0,0,0,0.05)]">
                <img
                  src={pageImages.damagedPorch}
                  alt="Porch and doorway showing deferred maintenance"
                  className="h-80 w-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {detailCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-black/10 bg-[#f8f5ee] p-6"
              >
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-neutral-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-neutral-600">
                  {item.body}
                </p>
              </div>
            ))}
            <div className="rounded-[1.75rem] border border-black/10 bg-white/85 p-6 md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
                Why sellers reach out
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {sellerReasons.concat(["Needs cleanup before listing", "Just wants to know their options"]).map(
                  (reason) => (
                    <div
                      key={reason}
                      className="rounded-2xl border border-black/8 bg-[#f8f5ee] px-4 py-3 text-sm text-neutral-700"
                    >
                      {reason}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto w-full max-w-7xl px-6 md:px-10">
          <div className="rounded-[2.25rem] bg-black px-8 py-12 text-white md:px-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/55">
                  Ready when you are
                </p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                  Start with the property. We will take it from there.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/72">
                  If you are even thinking about selling, send the details and
                  we will follow up with a simple next step.
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/72">
                  <a
                    href={contactDetails.phoneHref}
                    className="font-medium text-white"
                  >
                    {contactDetails.phone}
                  </a>
                  <a
                    href={contactDetails.emailHref}
                    className="text-white/80"
                  >
                    {contactDetails.email}
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="#offer-form"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  Start Here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
