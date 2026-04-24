import OpenAI from "openai";
import { getAuthenticatedUser, isAdmin } from "@/app/lib/auth";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const provider = process.env.DEAL_ANALYZER_PROVIDER || "openai";

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    propertySummary: { type: "string" },
    confidence: {
      type: "string",
      enum: ["Low", "Medium", "High"],
    },
    estimatedArv: { type: "number" },
    estimatedRepairCost: { type: "number" },
    estimatedHoldingCost: { type: "number" },
    assumptions: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 5,
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "url"],
      },
      minItems: 1,
      maxItems: 4,
    },
  },
  required: [
    "headline",
    "propertySummary",
    "confidence",
    "estimatedArv",
    "estimatedRepairCost",
    "estimatedHoldingCost",
    "assumptions",
    "sources",
  ],
} as const;

const SYSTEM_PROMPT = `
You are a real estate deal analyzer for off-market investors in the United States.
Use web search when needed to estimate a property's likely ARV, rough repair budget, and rough holding/closing costs from public information.

Rules:
- Be conservative and practical for investor underwriting.
- Do not pretend to know exact interior condition if it is unavailable.
- When data is thin, lower confidence and explain the assumptions.
- Focus on likely after-repair value, not current Zestimate-style value.
- Return valid JSON only matching the requested schema.
- Source URLs must be public pages that informed the estimate.
`.trim();

function sanitizeCurrency(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

function fallbackAnalysis(address: string, sellerAsk: string) {
  const ask = sanitizeCurrency(sellerAsk);
  const estimatedArv = ask > 0 ? Math.round(ask * 1.35) : 0;
  const estimatedRepairCost = ask > 0 ? Math.max(Math.round(ask * 0.08), 12000) : 15000;
  const estimatedHoldingCost = ask > 0 ? Math.max(Math.round(ask * 0.04), 8000) : 10000;

  return {
    analysis: {
      headline: address,
      propertySummary:
        "Manual analyzer mode is active. These are quick starting numbers so you can keep underwriting deals even while the AI API is unavailable.",
      confidence: "Low" as const,
      estimatedArv,
      estimatedRepairCost,
      estimatedHoldingCost,
      assumptions: [
        ask > 0
          ? "Used the seller ask as the starting point because live AI analysis is unavailable."
          : "No seller ask was provided, so baseline investor placeholder numbers were used.",
        "Repair cost is a conservative placeholder and should be replaced with your actual scope.",
        "Holding and closing costs are a quick underwriting estimate only.",
      ],
      sources: [],
      provider: "manual",
    },
  };
}

export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  const address = String(data.address ?? "").trim();
  const sellerAsk = String(data.sellerAsk ?? "").trim();

  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!address) {
      return Response.json(
        { error: "Enter a property address first." },
        { status: 400 }
      );
    }

    if (provider !== "openai" || !openai) {
      return Response.json(fallbackAnalysis(address, sellerAsk));
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search" }],
      instructions: SYSTEM_PROMPT,
      input: `
Analyze this property for an investor deal calculator.

Address: ${address}
Seller asking price: ${sellerAsk || "Unknown"}

Estimate:
1. likely ARV
2. likely repair cost
3. likely holding and closing cost bucket
4. confidence level
5. concise summary and assumptions
6. a few public source URLs used in the estimate
      `.trim(),
      text: {
        format: {
          type: "json_schema",
          name: "deal_analysis",
          strict: true,
          schema: ANALYSIS_SCHEMA,
        },
      },
    });

    const analysis = JSON.parse(response.output_text);

    return Response.json({
      analysis: {
        headline: String(analysis.headline || address),
        propertySummary: String(analysis.propertySummary || ""),
        confidence:
          analysis.confidence === "Low" ||
          analysis.confidence === "Medium" ||
          analysis.confidence === "High"
            ? analysis.confidence
            : "Low",
        estimatedArv: sanitizeCurrency(analysis.estimatedArv),
        estimatedRepairCost: sanitizeCurrency(analysis.estimatedRepairCost),
        estimatedHoldingCost: sanitizeCurrency(analysis.estimatedHoldingCost),
        assumptions: Array.isArray(analysis.assumptions)
          ? analysis.assumptions
              .map((item: unknown) => String(item || "").trim())
              .filter(Boolean)
              .slice(0, 5)
          : [],
        sources: Array.isArray(analysis.sources)
          ? analysis.sources
              .map((item: { title?: unknown; url?: unknown }) => ({
                title: String(item?.title || "").trim(),
                url: String(item?.url || "").trim(),
              }))
              .filter((item: { title: string; url: string }) => item.title && item.url)
              .slice(0, 4)
          : [],
        provider: "openai",
      },
    });
  } catch (error) {
    console.error("Deal analyzer error:", error);

    if (address) {
      return Response.json(fallbackAnalysis(address, sellerAsk));
    }

    return Response.json({ error: "Enter a property address first." }, { status: 400 });
  }
}
