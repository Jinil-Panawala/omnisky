CREATE TABLE public.aircraft_positions (
  icao24 TEXT PRIMARY KEY,
  callsign TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  altitude_m DOUBLE PRECISION,
  velocity_ms DOUBLE PRECISION,
  heading_deg DOUBLE PRECISION,
  vertical_rate_ms DOUBLE PRECISION,
  on_ground BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aircraft_positions TO anon;
GRANT SELECT ON public.aircraft_positions TO authenticated;
GRANT ALL ON public.aircraft_positions TO service_role;
ALTER TABLE public.aircraft_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view aircraft positions" ON public.aircraft_positions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.vessel_positions (
  mmsi TEXT PRIMARY KEY,
  ship_name TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  speed_kn DOUBLE PRECISION,
  course_deg DOUBLE PRECISION,
  heading_deg DOUBLE PRECISION,
  ship_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vessel_positions TO anon;
GRANT SELECT ON public.vessel_positions TO authenticated;
GRANT ALL ON public.vessel_positions TO service_role;
ALTER TABLE public.vessel_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vessel positions" ON public.vessel_positions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.satellite_tles (
  norad_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tle_line1 TEXT NOT NULL,
  tle_line2 TEXT NOT NULL,
  category TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.satellite_tles TO anon;
GRANT SELECT ON public.satellite_tles TO authenticated;
GRANT ALL ON public.satellite_tles TO service_role;
ALTER TABLE public.satellite_tles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view satellites" ON public.satellite_tles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.launches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rocket TEXT,
  mission TEXT,
  provider TEXT,
  pad_name TEXT,
  pad_lat DOUBLE PRECISION,
  pad_lon DOUBLE PRECISION,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launches TO anon;
GRANT SELECT ON public.launches TO authenticated;
GRANT ALL ON public.launches TO service_role;
ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view launches" ON public.launches FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.position_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  craft_type TEXT NOT NULL,
  craft_id TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  altitude_m DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.position_history TO anon;
GRANT SELECT ON public.position_history TO authenticated;
GRANT ALL ON public.position_history TO service_role;
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view position history" ON public.position_history FOR SELECT TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.aircraft_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vessel_positions;