"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

type DealCalculatorForm = {
  propertyName: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  arv: string;
  repairCost: string;
  holdingCost: string;
  sellerAsk: string;
};

type DealAnalysis = {
  headline: string;
  propertySummary: string;
  confidence: "Low" | "Medium" | "High";
  estimatedArv: number;
  estimatedRepairCost: number;
  estimatedHoldingCost: number;
  provider?: string;
  assumptions: string[];
  sources: Array<{
    title: string;
    url: string;
  }>;
};

type SavedDealNotes = {
  propertyName: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  arv: string;
  repairCost: string;
  holdingCost: string;
  sellerAsk: string;
  buyPercentage: string;
  fee: string;
  analysis: DealAnalysis | null;
};

type SavedDeal = {
  id: number;
  title: string;
  address: string;
  buyPercentage: string;
  mao: string;
  createdAt: string;
  form: DealCalculatorForm;
  fee: string;
  analysis: DealAnalysis | null;
};

const DEFAULT_FEE = 10000;

function parseMoney(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseSavedDeal(rawDeal: {
  id: number;
  title: string;
  leadName: string;
  value?: string | null;
  notes?: string | null;
  createdAt: string;
}) {
  try {
    const parsedNotes = rawDeal.notes
      ? (JSON.parse(rawDeal.notes) as SavedDealNotes)
      : null;

    if (!parsedNotes) {
      return null;
    }

    return {
      id: rawDeal.id,
      title: rawDeal.title,
      address: parsedNotes.address || rawDeal.leadName || "",
      buyPercentage: parsedNotes.buyPercentage || "70",
      mao: rawDeal.value || "0",
      createdAt: rawDeal.createdAt,
      form: {
        propertyName: parsedNotes.propertyName || rawDeal.title || "",
        address: parsedNotes.address || "",
        beds: parsedNotes.beds || "",
        baths: parsedNotes.baths || "",
        sqft: parsedNotes.sqft || "",
        arv: parsedNotes.arv || "",
        repairCost: parsedNotes.repairCost || "",
        holdingCost: parsedNotes.holdingCost || "",
        sellerAsk: parsedNotes.sellerAsk || "",
      },
      fee: parsedNotes.fee || DEFAULT_FEE.toString(),
      analysis: parsedNotes.analysis || null,
    } satisfies SavedDeal;
  } catch {
    return null;
  }
}

export default function DealsPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, logout } = useAuth();
  const [fee, setFee] = useState(DEFAULT_FEE.toString());
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState<DealAnalysis | null>(null);
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [form, setForm] = useState<DealCalculatorForm>({
    propertyName: "",
    address: "",
    beds: "",
    baths: "",
    sqft: "",
    arv: "",
    repairCost: "",
    holdingCost: "",
    sellerAsk: "",
  });
  const [buyPercentage, setBuyPercentage] = useState("70");

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    } else if (currentUser?.appScope === "records-only") {
      router.push("/records");
    }
  }, [isInitialized, isLoggedIn, currentUser, router]);

  useEffect(() => {
    if (isInitialized !== true || !isLoggedIn) {
      return;
    }

    let ignore = false;

    async function loadSavedDeals() {
      try {
        const response = await fetch("/api/deals");
        const data = await response.json();

        if (!response.ok || ignore) {
          return;
        }

        const nextSavedDeals = Array.isArray(data)
          ? data
              .map((item) =>
                parseSavedDeal(item as {
                  id: number;
                  title: string;
                  leadName: string;
                  value?: string | null;
                  notes?: string | null;
                  createdAt: string;
                })
              )
              .filter((item): item is SavedDeal => item !== null)
          : [];

        setSavedDeals(nextSavedDeals);
      } catch (error) {
        console.error("Failed to load saved deals", error);
      }
    }

    loadSavedDeals();

    return () => {
      ignore = true;
    };
  }, [isInitialized, isLoggedIn]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!isLoggedIn || isInitialized === null) {
    return <div className="p-6">Loading...</div>;
  }

  const canEdit = currentUser?.role === "admin";

  const arv = parseMoney(form.arv);
  const repairCost = parseMoney(form.repairCost);
  const holdingCost = parseMoney(form.holdingCost);
  const sellerAsk = parseMoney(form.sellerAsk);
  const assignmentFee = parseMoney(fee);
  const parsedBuyPercentage = parseMoney(buyPercentage);
  const buyTarget = arv * (parsedBuyPercentage / 100);
  const maoBeforeFee = buyTarget - repairCost - holdingCost;
  const mao = maoBeforeFee - assignmentFee;
  const spreadToAsk = mao - sellerAsk;

  function updateField(field: keyof DealCalculatorForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applySavedDeal(savedDeal: SavedDeal) {
    setForm(savedDeal.form);
    setBuyPercentage(savedDeal.buyPercentage);
    setFee(savedDeal.fee);
    setAnalysis(savedDeal.analysis);
    setAnalysisError("");
    setSaveMessage(`Loaded ${savedDeal.title}`);
  }

  async function handleSaveDeal() {
    const title = form.propertyName.trim() || form.address.trim() || "Untitled Deal";

    setIsSavingDeal(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          leadName: form.address.trim() || "No address",
          buyerName: `Buy at ${buyPercentage || "0"}%`,
          status: "Saved",
          value: mao.toString(),
          notes: JSON.stringify({
            propertyName: form.propertyName,
            address: form.address,
            beds: form.beds,
            baths: form.baths,
            sqft: form.sqft,
            arv: form.arv,
            repairCost: form.repairCost,
            holdingCost: form.holdingCost,
            sellerAsk: form.sellerAsk,
            buyPercentage,
            fee,
            analysis,
          } satisfies SavedDealNotes),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save deal.");
      }

      const nextSavedDeal = parseSavedDeal(
        data as {
          id: number;
          title: string;
          leadName: string;
          value?: string | null;
          notes?: string | null;
          createdAt: string;
        }
      );

      if (nextSavedDeal) {
        setSavedDeals((prev) => [nextSavedDeal, ...prev]);
      }

      setSaveMessage(`Saved ${title}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save deal.";
      setSaveMessage(message);
    } finally {
      setIsSavingDeal(false);
    }
  }

  async function handleDeleteDeal(id: number) {
    try {
      const response = await fetch("/api/deals", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete deal.");
      }

      setSavedDeals((prev) => prev.filter((deal) => deal.id !== id));
    } catch (error) {
      console.error("Failed to delete deal", error);
      setSaveMessage("Failed to delete deal.");
    }
  }

  async function handleAnalyzeAddress() {
    const address = form.address.trim();

    if (!address) {
      setAnalysisError("Add an address first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const response = await fetch("/api/deal-analyzer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          sellerAsk: form.sellerAsk,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ChatGPT could not analyze that address.");
      }

      const nextAnalysis = data.analysis as DealAnalysis;
      setAnalysis(nextAnalysis);
      setForm((prev) => ({
        ...prev,
        propertyName: prev.propertyName || nextAnalysis.headline || address,
        arv: nextAnalysis.estimatedArv
          ? nextAnalysis.estimatedArv.toString()
          : prev.arv,
        repairCost: nextAnalysis.estimatedRepairCost
          ? nextAnalysis.estimatedRepairCost.toString()
          : prev.repairCost,
        holdingCost: nextAnalysis.estimatedHoldingCost
          ? nextAnalysis.estimatedHoldingCost.toString()
          : prev.holdingCost,
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "ChatGPT could not analyze that address.";
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
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
              Deal Analyzer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Cleaner underwriting, faster edits, and a stronger layout for running numbers with confidence.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 min-w-72">
            <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">Your Fee</div>
            {isEditingFee ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="w-full rounded-2xl border border-emerald-200 bg-white p-2.5"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="10000"
                  disabled={!canEdit}
                />
                <button
                  onClick={() => setIsEditingFee(false)}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm hover:bg-emerald-50"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-2xl font-semibold text-emerald-900">{formatMoney(assignmentFee)}</div>
                <button
                  onClick={() => setIsEditingFee(true)}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm hover:bg-emerald-50"
                  disabled={!canEdit}
                >
                  Edit Fee
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-4">
          <Link
            href="/crm"
            className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
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
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 font-medium text-white"
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  AI Input
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Address Analyzer</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Use the address to estimate ARV, rehab, and carrying costs.
                </p>
              </div>
              <button
                onClick={handleAnalyzeAddress}
                disabled={isAnalyzing || !canEdit}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? "Analyzing..." : "Run Analyzer"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Property address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Seller Asking Price"
                value={form.sellerAsk}
                onChange={(e) => updateField("sellerAsk", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Beds"
                value={form.beds}
                onChange={(e) => updateField("beds", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Baths"
                value={form.baths}
                onChange={(e) => updateField("baths", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Sq Ft"
                value={form.sqft}
                onChange={(e) => updateField("sqft", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {analysisError ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {analysisError}
              </div>
            ) : null}

            {analysis ? (
              <div className="mt-4 rounded-[28px] border border-stone-200 bg-stone-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold">{analysis.headline}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      analysis.confidence === "High"
                        ? "bg-green-100 text-green-700"
                        : analysis.confidence === "Medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {analysis.confidence} confidence
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {analysis.provider === "openai" ? "AI mode" : "Manual mode"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-700">{analysis.propertySummary}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Estimated ARV
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatMoney(analysis.estimatedArv)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Estimated Repairs
                    </div>
                    <div className="mt-1 text-lg font-semibold text-red-800">
                      {formatMoney(analysis.estimatedRepairCost)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Holding / Closing
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatMoney(analysis.estimatedHoldingCost)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Assumptions</div>
                    <ul className="mt-2 space-y-2 text-sm text-gray-700">
                      {analysis.assumptions.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Sources</div>
                    <div className="mt-2 space-y-2 text-sm">
                      {analysis.sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-2xl border border-stone-200 bg-white px-3 py-3 hover:bg-gray-100"
                        >
                          <div className="font-medium text-gray-900">{source.title}</div>
                          <div className="text-xs text-gray-500 break-all">{source.url}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Underwriting Inputs
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Deal Numbers</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3 md:col-span-2"
                placeholder="Property / Deal Name"
                value={form.propertyName}
                onChange={(e) => updateField("propertyName", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Beds"
                value={form.beds}
                onChange={(e) => updateField("beds", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Baths"
                value={form.baths}
                onChange={(e) => updateField("baths", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Sq Ft"
                value={form.sqft}
                onChange={(e) => updateField("sqft", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-sky-200 bg-sky-50 text-sky-900 p-3 font-semibold"
                placeholder="ARV"
                value={form.arv}
                onChange={(e) => updateField("arv", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3 font-semibold text-red-800"
                placeholder="Repair Cost"
                value={form.repairCost}
                onChange={(e) => updateField("repairCost", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Holding / Closing Cost"
                value={form.holdingCost}
                onChange={(e) => updateField("holdingCost", e.target.value)}
                disabled={!canEdit}
              />
              <input
                className="rounded-2xl border border-stone-200 bg-white p-3"
                placeholder="Seller Asking Price"
                value={form.sellerAsk}
                onChange={(e) => updateField("sellerAsk", e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Buy Percentage
              </h3>
              <div className="mt-3">
                <input
                  className="rounded-2xl border border-stone-200 bg-white p-3"
                  placeholder="70"
                  value={buyPercentage}
                  onChange={(e) => setBuyPercentage(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-stone-200 bg-stone-50 p-4">
              <div className="text-sm text-gray-600">Formula</div>
              <div className="mt-2 text-sm">
                `MAO = (ARV x Buy %) - Repairs - Holding Costs - Your Fee`
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSaveDeal}
                disabled={isSavingDeal || !canEdit}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingDeal ? "Saving..." : "Save Deal"}
              </button>
              {saveMessage ? (
                <div className="text-sm text-gray-600">{saveMessage}</div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Saved Deals</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Reopen any saved deal and keep working the numbers.
                </p>
              </div>
              <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-gray-500">{savedDeals.length} saved</div>
            </div>

            {savedDeals.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-stone-300 p-4 text-sm text-gray-500">
                No saved deals yet.
              </div>
            ) : (
              <div className="space-y-3">
                {savedDeals.map((savedDeal) => (
                  <div
                    key={savedDeal.id}
                    className="rounded-[24px] border border-stone-200 bg-stone-50 p-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{savedDeal.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {savedDeal.address || "No address"}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                        <span>Buy %: {savedDeal.buyPercentage || "0"}%</span>
                        <span>MAO: {formatMoney(parseMoney(savedDeal.mao))}</span>
                        <span>
                          Saved: {new Date(savedDeal.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit ? (
                        <>
                          <button
                            onClick={() => applySavedDeal(savedDeal)}
                            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm hover:bg-stone-100"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteDeal(savedDeal.id)}
                            className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-6">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
            Output
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 mb-4">MAO Result</h2>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Property</div>
              <div className="font-medium">
                {form.propertyName.trim() || form.address.trim() || "No property name yet"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Beds / Baths / Sq Ft</div>
              <div className="font-medium">
                {[
                  form.beds ? `${form.beds} bd` : null,
                  form.baths ? `${form.baths} ba` : null,
                  form.sqft ? `${form.sqft} sqft` : null,
                ]
                  .filter(Boolean)
                  .join(" | ") || "Not added yet"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">ARV</div>
              <div className="font-semibold text-sky-700">{formatMoney(arv)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Seller Ask</div>
              <div className="font-medium">{formatMoney(sellerAsk)}</div>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Current MAO</div>
                  <div className="text-xs text-gray-500">
                    Buy at {parsedBuyPercentage || 0}%
                  </div>
                </div>
                <div className="text-lg font-bold text-green-700">{formatMoney(mao)}</div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">ARV x Buy %</span>
                  <span className="font-medium">{formatMoney(buyTarget)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Repairs</span>
                  <span className="font-medium text-red-800">{formatMoney(repairCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Holding Costs</span>
                  <span className="font-medium">{formatMoney(holdingCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">MAO Before Fee</span>
                  <span className="font-medium">{formatMoney(maoBeforeFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Your Fee</span>
                  <span className="font-medium">{formatMoney(assignmentFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  <span className="text-gray-500">Spread To Ask</span>
                  <span
                    className={`font-semibold ${
                      spreadToAsk >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatMoney(spreadToAsk)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      </div>
    </main>
  );
}
