ALTER TABLE public.job_assignments DROP CONSTRAINT IF EXISTS job_assignments_status_check;

UPDATE public.job_assignments SET status = 'in_testing' WHERE status = 'in_progress';
UPDATE public.job_assignments SET status = 'approved' WHERE status = 'completed';

ALTER TABLE public.job_assignments ADD CONSTRAINT job_assignments_status_check CHECK (status IN ('pending', 'assigned', 'accepted', 'in_testing', 'report_uploaded', 'in_review', 'approved', 'rejected'));
ALTER TABLE public.job_assignments ADD COLUMN IF NOT EXISTS report_url TEXT;
ALTER TABLE public.job_assignments ADD COLUMN IF NOT EXISTS reviewer_remark TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'reports' );
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'reports' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'reports' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'reports' AND auth.role() = 'authenticated' );
