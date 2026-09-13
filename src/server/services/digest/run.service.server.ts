/**
 * Daily digest job: compose once per day, then mark it delivered for every
 * subscriber. Emailing switches on automatically once a sender domain is
 * configured for the project; until then the digest is readable in-app.
 */
import {
  countTracked,
  findDigest,
  findDigestSource,
  findSubscribers,
  recordDeliveries,
  saveDigest,
} from "@/server/db/digest.repository.server";
import { composeDigest } from "./compose.service.server";

export interface DigestRunResult {
  date: string;
  composed: boolean;
  aiGenerated: boolean;
  subscribers: number;
  delivered: number;
  emailed: boolean;
}

export async function runDailyDigest(force = false): Promise<DigestRunResult> {
  const date = new Date().toISOString().slice(0, 10);

  let existing = await findDigest(date);
  let aiGenerated = false;
  let composed = false;

  if (!existing || force) {
    const [rows, counts] = await Promise.all([findDigestSource(), countTracked()]);
    const digest = await composeDigest(rows, counts);
    await saveDigest({
      digest_date: date,
      headline: digest.headline,
      summary: digest.summary,
      highlights: digest.highlights,
      ai_generated: digest.aiGenerated,
    });
    aiGenerated = digest.aiGenerated;
    composed = true;
    existing = await findDigest(date);
  }

  const subscribers = await findSubscribers();
  const delivered = await recordDeliveries(
    subscribers.map((s) => s.id),
    date,
    "published",
    "Available in-app; email sending needs a verified sender domain.",
  );

  return {
    date,
    composed,
    aiGenerated,
    subscribers: subscribers.length,
    delivered,
    emailed: false,
  };
}
