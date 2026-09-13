import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useDailyDigest } from "@/hooks/useDailyDigest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { STRINGS } from "@/domain/strings";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — OmniSky" },
      {
        name: "description",
        content: "Manage your OmniSky profile and subscribe to the daily AI intelligence digest.",
      },
      { property: "og:title", content: "Your account — OmniSky" },
      {
        property: "og:description",
        content: "Manage your profile and daily digest preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, avatarSrc, saving, save, uploadAvatar } = useProfile(user?.id);
  const digest = useDailyDigest(!!user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-console-bg text-console-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  async function persist(patch: Record<string, unknown>) {
    await save(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <main className="min-h-screen bg-console-bg text-console-text px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-console-muted hover:text-console-text">
            <ArrowLeft className="w-4 h-4" /> Back to the console
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
            {STRINGS.account.signOut}
          </Button>
        </div>

        <section className="rounded-lg border border-console-border bg-console-panel p-6 space-y-5">
          <h1 className="text-sm font-semibold uppercase tracking-wider">
            {STRINGS.account.accountTitle}
          </h1>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-console-bg border border-console-border-subtle flex items-center justify-center text-console-dim text-sm">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Your profile picture" className="w-full h-full object-cover" />
              ) : (
                (displayName || user.email || "?").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Change picture
              </Button>
              <p className="mt-1 text-[11px] text-console-dim">{user.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-console-muted">
              {STRINGS.account.displayNameLabel}
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-console-bg border-console-border-subtle text-console-text"
              />
              <Button
                size="sm"
                disabled={saving}
                onClick={() => persist({ display_name: displayName })}
              >
                Save
              </Button>
            </div>
            {saved && <p className="text-[11px] text-emerald-400">{STRINGS.account.saved}</p>}
          </div>
        </section>

        <section className="rounded-lg border border-console-border bg-console-panel p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              {STRINGS.account.digestTitle}
            </h2>
            <p className="mt-1 text-[11px] text-console-muted">{STRINGS.account.digestBlurb}</p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="digest" className="text-xs text-console-muted">
              {STRINGS.account.digestOn}
            </Label>
            <Switch
              id="digest"
              checked={profile?.digest_enabled ?? false}
              onCheckedChange={(checked) => void persist({ digest_enabled: checked })}
            />
          </div>

          {digest.data && (
            <div className="rounded-md border border-console-border-subtle bg-console-bg p-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-console-dim">
                Latest digest · {digest.data.digest_date}
              </p>
              <h3 className="mt-1 text-sm font-medium">{digest.data.headline}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-console-muted">
                {digest.data.summary}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
