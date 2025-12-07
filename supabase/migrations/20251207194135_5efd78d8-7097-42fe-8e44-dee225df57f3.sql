-- Remove duplicate cron jobs
SELECT cron.unschedule(7);
SELECT cron.unschedule(8);

-- Create a single cron job that runs every minute to check for reports to send
SELECT cron.schedule(
  'daily-report-scheduler',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://jtfvqbgqenrsmsmmbydu.supabase.co/functions/v1/send-daily-report',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnZxYmdxZW5yc21zbW1ieWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc4MTYsImV4cCI6MjA2Mzc4MzgxNn0.f4wkPVQpULrVMqNK9MbqpLJUJEPQIIjDXnSIYSwJuQE'
      ),
      body:='{"scheduled": true}'::jsonb,
      timeout_milliseconds:=30000
    );
  $$
);