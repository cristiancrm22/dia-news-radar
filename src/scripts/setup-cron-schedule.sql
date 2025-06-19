
-- Eliminar el cron job existente si existe
SELECT cron.unschedule('send-scheduled-whatsapp-news');

-- Crear nuevo cron job que se ejecute cada minuto
SELECT cron.schedule(
  'send-scheduled-whatsapp-news',
  '* * * * *', -- Cada minuto
  $$
  SELECT
    net.http_post(
        url:='https://zajgwopxogvsfpplcdie.supabase.co/functions/v1/send-scheduled-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphamd3b3B4b2d2c2ZwcGxjZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNTAzMTksImV4cCI6MjA2MzkyNjMxOX0.Qarj8I7767cuID6BR3AEY11ALiVH-MzT8Ht8XipwMGI"}'::jsonb,
        body:='{"type": "whatsapp", "scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Verificar que el cron job fue creado
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-whatsapp-news';
