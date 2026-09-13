import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  digest_enabled: boolean;
  digest_hour_utc: number;
}

/** Reads and updates the signed-in user's own profile row. */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, digest_enabled, digest_hour_utc")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
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
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await save({ avatar_url: data.publicUrl });
    },
    [userId, save],
  );

  return { profile, saving, save, uploadAvatar, reload: load };
}
