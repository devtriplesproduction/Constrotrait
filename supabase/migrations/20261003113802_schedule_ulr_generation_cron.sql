-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
    PERFORM cron.unschedule('process-ulr-generation-queue');
EXCEPTION WHEN OTHERS THEN
    -- Job probably didn't exist, ignore
END $$;

-- Schedule the cron job to run daily at 1:00 AM (server time)
-- We call it for CURRENT_DATE.
SELECT cron.schedule(
    'process-ulr-generation-queue', 
    '0 1 * * *', 
    $$
    SELECT public.process_ulr_queue_for_date(CURRENT_DATE::text);
    $$
);
