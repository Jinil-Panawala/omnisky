/** Small presentation helpers shared by the alert and insight panels. */
import type { ActiveAlert } from "@/domain/console";

export function formatRelativeShort(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export function severityColorClass(severity: ActiveAlert["severity"]): string {
  if (severity === "critical") return "text-alert";
  if (severity === "warning") return "text-alert-warning";
  return "text-alert-info";
}
