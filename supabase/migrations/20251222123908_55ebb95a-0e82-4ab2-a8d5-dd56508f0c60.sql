-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the send-anotacao-reminders function to run every minute
SELECT cron.schedule(
  'send-anotacao-reminders',
  '* * * * *',
  $$SELECT net.http_post(
    url:='https://jtfvqbgqenrsmsmmbydu.supabase.co/functions/v1/send-anotacao-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnZxYmdxZW5yc21zbW1ieWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzU3NTAsImV4cCI6MjA3NzkxMTc1MH0.120Jg0ELnYTcGVQwkDGTsNZ5ZexbDtbBB9b_6BmnSCM"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;$$
);