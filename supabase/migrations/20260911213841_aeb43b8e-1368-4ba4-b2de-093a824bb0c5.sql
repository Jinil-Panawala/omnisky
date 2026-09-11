CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(jobname) FROM cron.job
  WHERE jobname IN ('omnisky_ingest_launches','omnisky_ingest_satellites','omnisky_prune_history');

SELECT cron.schedule('omnisky_ingest_launches', '5 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--2fd94b73-6d57-415c-a374-ffddd962a852-dev.lovable.app/api/public/ingest/launches',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_AoGR4NiHKD3Nt_yIY9ntRw_dKKP897_"}'::jsonb,
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('omnisky_ingest_satellites', '7 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--2fd94b73-6d57-415c-a374-ffddd962a852-dev.lovable.app/api/public/ingest/satellites',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_AoGR4NiHKD3Nt_yIY9ntRw_dKKP897_"}'::jsonb,
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('omnisky_prune_history', '30 3 * * *', $cron$
  DELETE FROM public.position_history WHERE recorded_at < now() - interval '24 hours';
$cron$);