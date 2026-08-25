-- Add HR Management fields to profiles
ALTER TABLE public.profiles
ADD COLUMN dob DATE,
ADD COLUMN gender TEXT,
ADD COLUMN personal_email TEXT,
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create activity_logs table for audit trail
CREATE TABLE public.activity_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical', 'security')),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- We don't add any public SELECT/INSERT policies to activity_logs.
-- Server Actions use the Supabase Service Role key which bypasses RLS.
-- This ensures the audit logs are strictly protected from client-side access.
