import { SOURCE_ATTRIBUTION } from "@/domain/constants";
import { STRINGS } from "@/domain/strings";
import type { DataMode } from "@/domain/console";

/** Status line with data-source attribution and the usage disclaimer. */
export function ConsoleFooter({ mode }: { mode: DataMode }) {
  return (
    <footer className="h-6 shrink-0 flex items-center gap-3 px-4 border-t border-console-border bg-console-panel overflow-x-auto">
      <span className="text-[10px] font-mono uppercase tracking-wider text-console-dim shrink-0">
        {mode === "live" ? STRINGS.footer.liveLabel : STRINGS.footer.demoLabel}
      </span>
      {SOURCE_ATTRIBUTION.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[10px] font-mono text-console-dim hover:text-console-text whitespace-nowrap"
        >
          {s.scope}: {s.label}
        </a>
      ))}
      <span className="text-[10px] font-mono text-console-dim whitespace-nowrap">
        {STRINGS.footer.disclaimer}
      </span>
    </footer>
  );
}
