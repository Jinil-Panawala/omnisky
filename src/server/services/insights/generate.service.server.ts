/**
 * AI wording pass. One streamed Lovable AI Gateway request per run rewrites up
 * to `INSIGHT_RULES.maxPerRun` detected candidates into analyst-style copy.
 *
 * Cost control: detection is free and happens first; the model only ever sees
 * the compact signal payloads, never raw track data. If the call fails the
 * candidates keep their rule-generated wording, so the console never breaks.
 */
import { INSIGHT_RULES } from "@/domain/insights";
import type { InsightCandidate, InsightSeverity } from "@/domain/insights";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

const SYSTEM_PROMPT = [
  "You are an OSINT watch-floor analyst writing short alert copy for a live tracking console.",
  "For each numbered signal, write a title of at most 6 words and a single factual sentence of at most 200 characters.",
  "Use only the facts given. Never invent identities, intent, affiliations, or locations.",
  "Keep severity unless the signal clearly justifies another level.",
].join(" ");

export class AiBlockedError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiBlockedError";
  }
}

interface WordedItem {
  index: number;
  title: string;
  description: string;
  severity: InsightSeverity;
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "title", "description", "severity"],
        properties: {
          index: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          severity: { type: "string", enum: ["critical", "warning", "info"] },
        },
      },
    },
  },
} as const;

function buildInput(candidates: InsightCandidate[]): string {
  const lines = candidates.map((c, i) =>
    JSON.stringify({
      index: i,
      category: c.category,
      severity: c.severity,
      entityType: c.entityType,
      signal: c.signal,
    }),
  );
  return `Signals:\n${lines.join("\n")}`;
}

/** Reads the SSE body and returns the concatenated output text. */
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
        // Ignore keep-alive or partial frames.
      }
    }
  }
  return text || completed;
}

function applyWording(
  candidates: InsightCandidate[],
  items: WordedItem[],
): InsightCandidate[] {
  const byIndex = new Map(items.map((i) => [i.index, i]));
  return candidates.map((candidate, i) => {
    const worded = byIndex.get(i);
    if (!worded?.title || !worded.description) return candidate;
    return {
      ...candidate,
      title: worded.title.slice(0, 80),
      description: worded.description.slice(0, 280),
      severity: worded.severity ?? candidate.severity,
    };
  });
}

/**
 * Returns the candidates with AI wording applied, or `null` when the gateway
 * failed in a way the caller should simply skip (rate limit, upstream error).
 * Throws `AiBlockedError` for 402/403 so the job can pause itself.
 */
export async function generateWording(
  candidates: InsightCandidate[],
): Promise<InsightCandidate[] | null> {
  if (candidates.length === 0) return [];
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const batch = candidates.slice(0, INSIGHT_RULES.maxPerRun);
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
      input: buildInput(batch),
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "worded_signals",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = `AI gateway ${response.status}`;
    if (response.status === 402 || response.status === 403) {
      throw new AiBlockedError(message, response.status);
    }
    console.error(message, await response.text().catch(() => ""));
    return null;
  }

  const raw = await readStreamedText(response);
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as { items?: WordedItem[] };
    if (!Array.isArray(parsed.items)) return null;
    return applyWording(batch, parsed.items);
  } catch {
    console.error("AI wording returned unparsable output");
    return null;
  }
}
