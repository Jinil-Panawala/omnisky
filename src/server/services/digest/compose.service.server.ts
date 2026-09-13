/**
 * Turns the last 24 hours of stored alerts into one short digest.
 *
 * Cost control: exactly one AI request per day, over already-detected items.
 * If the gateway is unavailable the digest still goes out with rule-written
 * wording, so subscribers never get an empty email.
 */
import type { DigestSourceRow } from "@/server/db/digest.repository.server";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

const SYSTEM_PROMPT = [
  "You are an OSINT watch-floor analyst writing a short daily brief for a live tracking console.",
  "Write a headline of at most 9 words and a summary of at most 3 sentences.",
  "Use only the supplied items and counts. Never invent events, places, or identities.",
  "Plain factual tone, no hype, no speculation about intent.",
].join(" ");

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
  },
} as const;

export interface ComposedDigest {
  headline: string;
  summary: string;
  highlights: Array<{ title: string; severity: string; category: string }>;
  aiGenerated: boolean;
}

function highlightsOf(rows: DigestSourceRow[]) {
  const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return [...rows]
    .sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3))
    .slice(0, 6)
    .map((r) => ({ title: r.title, severity: r.severity, category: r.category }));
}

function fallback(rows: DigestSourceRow[], counts: { aircraft: number; vessels: number }): ComposedDigest {
  const critical = rows.filter((r) => r.severity === "critical").length;
  return {
    headline: rows.length > 0 ? `${rows.length} notable events in the last 24 hours` : "A quiet 24 hours",
    summary: `Tracking ${counts.aircraft.toLocaleString()} aircraft and ${counts.vessels.toLocaleString()} vessels. ${rows.length} items were flagged, ${critical} of them critical.`,
    highlights: highlightsOf(rows),
    aiGenerated: false,
  };
}

async function readStreamedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && event.delta) text += event.delta;
        if (event.type === "response.completed" && event.response?.output_text) {
          completed = event.response.output_text;
        }
      } catch {
        // keep-alive or partial frame
      }
    }
  }
  return text || completed;
}

export async function composeDigest(
  rows: DigestSourceRow[],
  counts: { aircraft: number; vessels: number },
): Promise<ComposedDigest> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallback(rows, counts);

  const input = JSON.stringify({
    tracked: counts,
    items: rows.slice(0, 40).map((r) => ({
      category: r.category,
      severity: r.severity,
      title: r.title,
      description: r.description,
    })),
  });

  try {
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        instructions: SYSTEM_PROMPT,
        input,
        reasoning: { effort: "low" },
        text: {
          format: { type: "json_schema", name: "daily_digest", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });
    if (!response.ok) return fallback(rows, counts);
    const raw = await readStreamedText(response);
    const parsed = JSON.parse(raw) as { headline?: string; summary?: string };
    if (!parsed.headline || !parsed.summary) return fallback(rows, counts);
    return {
      headline: parsed.headline.slice(0, 120),
      summary: parsed.summary.slice(0, 600),
      highlights: highlightsOf(rows),
      aiGenerated: true,
    };
  } catch {
    return fallback(rows, counts);
  }
}
