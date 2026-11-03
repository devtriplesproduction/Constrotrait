-- Migration: 20261103000000_secure_rls_branch_isolation.sql
-- Enforce strict branch isolation RLS for clients and job_entries
-- Revoke undocumented DEVELOPER privileges from audit logs and backup tables

-- ============================================================================
-- 1. CLIENTS TABLE RLS HARDENING
-- ============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON public.clients;

-- New Branch-Isolated Policies for clients
CREATE POLICY "Super Admins can manage all clients"
ON public.clients FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

CREATE POLICY "Users can view clients within their branch"
ON public.clients FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid
  OR branch_id IS NULL
);

CREATE POLICY "Branch staff can insert clients within their branch"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE', 'ACCOUNTANT']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
);

CREATE POLICY "Branch staff can update clients within their branch"
ON public.clients FOR UPDATE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE', 'ACCOUNTANT']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE', 'ACCOUNTANT']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
);

-- ============================================================================
-- 2. JOB_ENTRIES TABLE RLS HARDENING
-- ============================================================================
ALTER TABLE public.job_entries ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read job_entries" ON public.job_entries;
DROP POLICY IF EXISTS "Allow authenticated users to insert job_entries" ON public.job_entries;
DROP POLICY IF EXISTS "Allow authenticated users to update job_entries" ON public.job_entries;
DROP POLICY IF EXISTS "Allow authenticated users to delete job_entries" ON public.job_entries;

-- New Branch-Isolated Policies for job_entries
CREATE POLICY "Super Admins can manage all job_entries"
ON public.job_entries FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

CREATE POLICY "Users can view job_entries within their branch"
ON public.job_entries FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid
  OR branch_id IS NULL
);

CREATE POLICY "Branch staff can insert job_entries within their branch"
ON public.job_entries FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
);

CREATE POLICY "Branch staff can update job_entries within their branch"
ON public.job_entries FOR UPDATE TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
  OR (
    (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['BRANCH_MANAGER_ADMINISTRATIVE', 'ADMIN_INWARD_CRE']
    AND (branch_id = (auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid OR branch_id IS NULL)
  )
);

-- ============================================================================
-- 3. REMOVE DEVELOPER PRIVILEGES FROM SYSTEM AUDIT AND BACKUP TABLES
-- ============================================================================
DROP POLICY IF EXISTS "Super Admins and Developers can view login audit logs" ON public.login_audit_logs;
CREATE POLICY "Super Admins can view login audit logs"
ON public.login_audit_logs FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

DROP POLICY IF EXISTS "Super Admins and Developers can manage database backups" ON public.database_backups;
CREATE POLICY "Super Admins can manage database backups"
ON public.database_backups FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

DROP POLICY IF EXISTS "Super Admins and Developers can manage database restore logs" ON public.database_restore_logs;
CREATE POLICY "Super Admins can manage database restore logs"
ON public.database_restore_logs FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' -> 'roles') ?| array['SUPER_ADMIN']
);

