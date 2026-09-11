import type { EntityType } from "./types";

const paths: Record<string, string> = {
  aircraft:
    "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  ship: "M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M12 2v3",
  satellite:
    "M13 7 9 3 5 7l4 4M17 11l4 4-4 4-4-4M8 12l4 4M16 8l-4-4M9 21a6 6 0 0 0-6-6M22 22a10 10 0 0 0-10-10",
  launch:
    "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  alert: "M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
};

const cache = new Map<string, string>();

export function entityIconUrl(type: EntityType, color: string, selected: boolean): string {
  const key = `${type}|${color}|${selected}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const d = paths[type] ?? paths["alert"]!;
  const ring = selected ? "#e2e8f0" : color;
  const ringWidth = selected ? 2.5 : 1.4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="27" fill="${color}" opacity="0.18"/>
  <circle cx="32" cy="32" r="19" fill="#050a18" opacity="0.9"/>
  <circle cx="32" cy="32" r="19" fill="none" stroke="${ring}" stroke-width="${ringWidth * 1.6}" opacity="0.95"/>
  <g transform="translate(15 15) scale(1.4)" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}"/>
  </g>
</svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, url);
  return url;
}
