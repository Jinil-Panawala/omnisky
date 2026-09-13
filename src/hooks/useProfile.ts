import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  /** Storage path inside the private `avatars` bucket. */
  avatar_url: string | null;
  digest_enabled: boolean;
  digest_hour_utc: number;
}

/** Reads and updates the signed-in user's own profile row and picture. */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, digest_enabled, digest_hour_utc")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return;
    setProfile(data as Profile);
    // The bucket is private, so the picture is shown through a short-lived link.
    if (data.avatar_url) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_url, 3600);
      setAvatarSrc(signed?.signedUrl ?? null);
    } else {
      setAvatarSrc(null);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!userId) return;
      setSaving(true);
      // Upsert covers accounts created before the profile trigger existed.
      await supabase.from("profiles").upsert({ id: userId, ...patch });
      await load();
      setSaving(false);
    },
    [userId, load],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!userId) return;
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "")}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) return;
      await save({ avatar_url: path });
    },
    [userId, save],
  );

  return { profile, avatarSrc, saving, save, uploadAvatar, reload: load };
}
