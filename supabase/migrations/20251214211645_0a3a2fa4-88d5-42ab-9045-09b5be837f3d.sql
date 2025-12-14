-- Create cron job for management report
SELECT
  cron.schedule(
    'management-report-scheduler',
    '* * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://jtfvqbgqenrsmsmmbydu.supabase.co/functions/v1/send-management-report',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnZxYmdxZW5yc21tbWJ5ZHUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0ODIwNzgxNiwiZXhwIjoyMDYzNzgzODE2fQ.f4wkPVQpULrVMqNK9MbqpLJUJEPQIIjDXnSIYSwJuQE'
        ),
        body:='{"scheduled": true}'::jsonb,
        timeout_milliseconds:=30000
      );
    $$
  );