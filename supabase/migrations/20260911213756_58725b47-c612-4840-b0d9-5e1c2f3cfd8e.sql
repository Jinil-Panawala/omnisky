CREATE TABLE IF NOT EXISTS public.data_sources (
  source_key text PRIMARY KEY,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  rows_written integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.data_sources TO anon;
GRANT SELECT ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view data sources" ON public.data_sources;
CREATE POLICY "Anyone can view data sources"
  ON public.data_sources FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.data_sources (source_key, label) VALUES
  ('adsb.lol', 'ADSB.lol'),
  ('aisstream', 'AISStream'),
  ('celestrak', 'CelesTrak'),
  ('launchlibrary2', 'Launch Library 2')
ON CONFLICT (source_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_data_sources_updated_at ON public.data_sources;
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS position_history_craft_idx
  ON public.position_history (craft_type, craft_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS position_history_recorded_at_idx
  ON public.position_history (recorded_at);
CREATE INDEX IF NOT EXISTS aircraft_positions_updated_at_idx
  ON public.aircraft_positions (updated_at);
CREATE INDEX IF NOT EXISTS vessel_positions_updated_at_idx
  ON public.vessel_positions (updated_at);

ALTER TABLE public.aircraft_positions REPLICA IDENTITY FULL;
ALTER TABLE public.vessel_positions REPLICA IDENTITY FULL;
ALTER TABLE public.launches REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aircraft_positions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vessel_positions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.launches;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;