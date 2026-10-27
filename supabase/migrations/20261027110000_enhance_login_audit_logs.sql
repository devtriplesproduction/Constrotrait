-- Migration: Enhance login_audit_logs with device_model, screen_resolution, city, country
ALTER TABLE public.login_audit_logs ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE public.login_audit_logs ADD COLUMN IF NOT EXISTS screen_resolution TEXT;
ALTER TABLE public.login_audit_logs ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.login_audit_logs ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_login_audit_logs_device_model ON public.login_audit_logs(device_model);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_city ON public.login_audit_logs(city);
