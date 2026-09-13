select cron.schedule(
  'omnisky_daily_digest',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://project--2fd94b73-6d57-415c-a374-ffddd962a852-dev.lovable.app/api/public/digest/run',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_AoGR4NiHKD3Nt_yIY9ntRw_dKKP897_"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);