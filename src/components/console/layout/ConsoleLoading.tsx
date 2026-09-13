import { STRINGS } from "@/domain/strings";

/** Shown while the browser-only globe bundle boots. */
export function ConsoleLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-console-bg text-console-muted">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono uppercase tracking-wider">
          {STRINGS.app.loadingConsole}
        </span>
      </div>
    </div>
  );
}
