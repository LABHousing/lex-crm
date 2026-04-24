"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function CrmHome() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, currentUsername, logout } =
    useAuth();

  useEffect(() => {
    if (isInitialized === false) {
      router.push("/login");
    } else if (isInitialized === true && !isLoggedIn) {
      router.push("/login");
    } else if (currentUser?.appScope === "records-only") {
      router.push("/records");
    }
  }, [isInitialized, isLoggedIn, currentUser, router]);

  if (isInitialized === null || !isLoggedIn) {
    return <div className="p-6">Loading...</div>;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f2e8_0%,#f5f7fb_42%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-[32px] border border-white/70 bg-white/85 px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Lex Ventured & Co CRM
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Home Base
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Clean access to the tools you use every day, with a simpler layout and faster
                movement across the CRM.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {currentUsername ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    Logged In
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {currentUsername}
                  </div>
                </div>
              ) : null}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                  Access
                </div>
                <div className="mt-1 text-base font-semibold text-emerald-900">
                  {currentUser?.role === "admin" ? "Admin" : "Team"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-4">
            <Link
              href="/crm"
              className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 font-medium text-white"
            >
              Home
            </Link>
            <Link
              href="/leads"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Leads
            </Link>
            <Link
              href="/deals"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Deal Analyzer
            </Link>
            <Link
              href="/records"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Records
            </Link>
            <Link
              href="/schedule-today"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Schedule Today
            </Link>
            {currentUser?.role === "admin" ? (
              <Link
                href="/users"
                className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                Users
              </Link>
            ) : null}
            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Dashboard
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Keep the day organized.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Use the CRM as a clean operating system for leads, underwriting, records, and
              follow-up. The layout is intentionally lighter so the next action is always easy to
              find.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Link
                href="/leads"
                className="rounded-[28px] border border-sky-200 bg-sky-50/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
                  Intake
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">Leads</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Capture a new seller fast and send them exactly where they belong.
                </p>
              </Link>
              <Link
                href="/deals"
                className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                  Underwrite
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">Deal Analyzer</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Run ARV, repairs, fee, and MAO cleanly in one place.
                </p>
              </Link>
              <Link
                href="/records"
                className="rounded-[28px] border border-stone-200 bg-stone-50/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-600">
                  Pipeline
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">Records</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Navigate every stage with the sticky rail and cleaner pipeline view.
                </p>
              </Link>
              <Link
                href="/schedule-today"
                className="rounded-[28px] border border-violet-200 bg-violet-50/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-700">
                  Daily Flow
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">Schedule Today</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Stay on calls, texts, and follow-ups without losing what got done.
                </p>
              </Link>
              {currentUser?.role === "admin" ? (
                <Link
                  href="/users"
                  className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                    Team
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-slate-950">Users</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Control access cleanly and keep editing rights with admins only.
                  </p>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Workflow
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Simple movement, less clutter.
              </h2>
              <div className="mt-5 space-y-4">
                {[
                  "Capture the seller on Leads",
                  "Underwrite it on Deal Analyzer",
                  "Track status inside Records",
                  "Work daily priorities in Schedule Today",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-700">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#111827,#1f2937)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.15)]">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                Focus
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                One place to run the business.
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                The goal is a CRM that feels sharp, controlled, and easy to move through on every
                page. This pass tightens the design so the tools feel more premium right away.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
