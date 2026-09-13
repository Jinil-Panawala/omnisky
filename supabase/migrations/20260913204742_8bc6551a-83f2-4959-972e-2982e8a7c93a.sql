CREATE TABLE public.insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('alert','insight')),
  severity TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
  category TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  signal JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  dedup_key TEXT NOT NULL UNIQUE,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '3 hours',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX insights_kind_detected_idx ON public.insights (kind, detected_at DESC);
CREATE INDEX insights_expires_idx ON public.insights (expires_at);

GRANT SELECT ON public.insights TO anon;
GRANT SELECT ON public.insights TO authenticated;
GRANT ALL ON public.insights TO service_role;

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insights are publicly readable"
ON public.insights FOR SELECT
USING (true);

CREATE TABLE public.insight_jobs (
  id TEXT NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','paused')),
  pause_reason TEXT,
  lease_expires_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_aircraft_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.insight_jobs TO service_role;

ALTER TABLE public.insight_jobs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.insight_jobs (id, status) VALUES ('default', 'idle');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_insights_updated_at
BEFORE UPDATE ON public.insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insight_jobs_updated_at
BEFORE UPDATE ON public.insight_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();