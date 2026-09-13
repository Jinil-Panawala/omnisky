import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STRINGS } from "@/domain/strings";
import { APP_NAME } from "@/domain/constants";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — OmniSky" },
      {
        name: "description",
        content: "Sign in to OmniSky to save your console settings and subscribe to the daily intelligence digest.",
      },
      { property: "og:title", content: "Sign in — OmniSky" },
      {
        property: "og:description",
        content: "Sign in to OmniSky to save your settings and receive the daily digest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/account" });
  }, [user, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (tab === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (signUpError) throw signUpError;
        setMessage(STRINGS.account.checkEmail);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    // Google goes through the managed broker so it also works inside the preview.
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(String(result.error));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-console-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8 text-console-text">
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/15 text-primary">
            <Radar className="w-5 h-5" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide">{APP_NAME}</span>
        </Link>

        <div className="rounded-lg border border-console-border bg-console-panel p-6">
          <div className="flex rounded-md border border-console-border-subtle bg-console-bg p-0.5 mb-5">
            {(["signin", "signup"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                  tab === value ? "bg-primary/20 text-primary" : "text-console-dim hover:text-console-text"
                }`}
              >
                {value === "signin" ? STRINGS.account.signIn : STRINGS.account.signUp}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs text-console-muted">
                  {STRINGS.account.displayNameLabel}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-console-bg border-console-border-subtle text-console-text"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-console-muted">
                {STRINGS.account.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-console-bg border-console-border-subtle text-console-text"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-console-muted">
                {STRINGS.account.passwordLabel}
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-console-bg border-console-border-subtle text-console-text"
              />
            </div>

            {error && <p className="text-[11px] text-alert">{error}</p>}
            {message && <p className="text-[11px] text-emerald-400">{message}</p>}

            <Button type="submit" disabled={busy} className="w-full">
              {tab === "signin" ? STRINGS.account.signIn : STRINGS.account.signUp}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-console-dim">
            <span className="h-px flex-1 bg-console-border" />
            or
            <span className="h-px flex-1 bg-console-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            {STRINGS.account.continueWithGoogle}
          </Button>
        </div>

        <p className="mt-6 text-center text-[11px] text-console-dim">
          The globe stays free and open —{" "}
          <Link to="/" className="text-primary hover:underline">
            back to the console
          </Link>
        </p>
      </div>
    </main>
  );
}
