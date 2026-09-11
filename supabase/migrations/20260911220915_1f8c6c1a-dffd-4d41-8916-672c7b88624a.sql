CREATE INDEX IF NOT EXISTS aircraft_positions_lat_lon_idx ON public.aircraft_positions (lat, lon);
CREATE INDEX IF NOT EXISTS aircraft_positions_updated_at_idx ON public.aircraft_positions (updated_at DESC);
CREATE INDEX IF NOT EXISTS vessel_positions_lat_lon_idx ON public.vessel_positions (lat, lon);
CREATE INDEX IF NOT EXISTS vessel_positions_updated_at_idx ON public.vessel_positions (updated_at DESC);
CREATE INDEX IF NOT EXISTS position_history_craft_time_idx ON public.position_history (craft_type, craft_id, recorded_at DESC);