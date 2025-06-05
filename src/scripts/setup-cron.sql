
-- Habilitar extensiones necesarias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear cron job para ejecutar el envío de noticias programadas cada minuto
-- Esto permitirá verificar si es hora de enviar mensajes a los suscriptores
SELECT cron.schedule(
  'send-scheduled-whatsapp-news',
  '* * * * *', -- cada minuto
  $$
  SELECT
    net.http_post(
        url:='https://zajgwopxogvsfpplcdie.supabase.co/functions/v1/send-scheduled-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphamd3b3B4b2d2c2ZwcGxjZGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNTAzMTksImV4cCI6MjA2MzkyNjMxOX0.Qarj8I7767cuID6BR3AEY11ALiVH-MzT8Ht8XipwMGI"}'::jsonb,
        body:='{"type": "whatsapp", "scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Ver los cron jobs activos
SELECT * FROM cron.job;
