-- Migration: Add DEVELOPER role, Login Audit Logs, Database Backups and Restore Logs
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'DEVELOPER';

-- 1. Login Audit Logs
CREATE TABLE IF NOT EXISTS public.login_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_login_audit_logs_user_id ON public.login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_created_at ON public.login_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_email ON public.login_audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_ip ON public.login_audit_logs(ip_address);

ALTER TABLE public.login_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins and Developers can view login audit logs" ON public.login_audit_logs;
CREATE POLICY "Super Admins and Developers can view login audit logs"
ON public.login_audit_logs FOR SELECT
USING (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'DEVELOPER']
);

DROP POLICY IF EXISTS "Allow insert login audit logs" ON public.login_audit_logs;
CREATE POLICY "Allow insert login audit logs"
ON public.login_audit_logs FOR INSERT
WITH CHECK (true);

-- 2. Database Backups
CREATE TABLE IF NOT EXISTS public.database_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    total_tables INTEGER NOT NULL DEFAULT 0,
    total_records INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_email TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_database_backups_created_at ON public.database_backups(created_at DESC);

ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins and Developers can manage database backups" ON public.database_backups;
CREATE POLICY "Super Admins and Developers can manage database backups"
ON public.database_backups FOR ALL
USING (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'DEVELOPER']
);

-- 3. Database Restore Logs
CREATE TABLE IF NOT EXISTS public.database_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    restored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    restorer_email TEXT,
    restore_mode TEXT NOT NULL DEFAULT 'UPSERT',
    tables_restored JSONB DEFAULT '{}'::jsonb,
    total_records_processed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_database_restore_logs_created_at ON public.database_restore_logs(created_at DESC);

ALTER TABLE public.database_restore_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins and Developers can manage database restore logs" ON public.database_restore_logs;
CREATE POLICY "Super Admins and Developers can manage database restore logs"
ON public.database_restore_logs FOR ALL
USING (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN', 'DEVELOPER']
);
