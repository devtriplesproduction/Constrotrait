-- 1. Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Insert initial 'Wai' branch
INSERT INTO public.branches (id, name, code, address)
VALUES (
    gen_random_uuid(),
    'Wai',
    'WAI-01',
    'Wai Main Office'
) ON CONFLICT (name) DO NOTHING;

-- 3. Add branch_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT;

-- 4. Backfill existing profiles to Wai branch
UPDATE public.profiles
SET branch_id = (SELECT id FROM public.branches WHERE name = 'Wai' LIMIT 1)
WHERE branch_id IS NULL;

-- 5. Create index
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);

-- Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read branches
CREATE POLICY "Authenticated users can read branches"
ON public.branches FOR SELECT
USING (auth.role() = 'authenticated');

-- Only Super Admins can manage branches
CREATE POLICY "Super Admins can insert branches"
ON public.branches FOR INSERT
WITH CHECK ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'SUPER_ADMIN');

CREATE POLICY "Super Admins can update branches"
ON public.branches FOR UPDATE
USING ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'SUPER_ADMIN');
