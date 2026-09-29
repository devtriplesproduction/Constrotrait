-- 1. Create table for yearly counters
CREATE TABLE IF NOT EXISTS ulr_yearly_counters (
    year INT PRIMARY KEY,
    last_seq INT NOT NULL DEFAULT 0
);

-- 2. Add columns to job_entry_tests
ALTER TABLE job_entry_tests
ADD COLUMN IF NOT EXISTS ulr_seq INT NULL,
ADD COLUMN IF NOT EXISTS ulr_number TEXT NULL,
ADD COLUMN IF NOT EXISTS ulr_year INT NULL,
ADD COLUMN IF NOT EXISTS ulr_generated_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS ulr_status TEXT NOT NULL DEFAULT 'pending';

-- 3. Add check constraint on status
DO $$ 
BEGIN
  ALTER TABLE job_entry_tests ADD CONSTRAINT job_entry_tests_ulr_status_check CHECK (ulr_status IN ('pending', 'generated'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Unique partial index on year + seq
CREATE UNIQUE INDEX IF NOT EXISTS job_entry_tests_ulr_unique_idx
ON job_entry_tests (ulr_year, ulr_seq)
WHERE ulr_seq IS NOT NULL AND ulr_year IS NOT NULL;

-- 5. RPC for generating ULRs for a specific date
CREATE OR REPLACE FUNCTION generate_ulr_for_date(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM p_date);
    v_job RECORD;
    v_seq INT;
BEGIN
    -- Ensure year exists in counters
    INSERT INTO ulr_yearly_counters (year, last_seq)
    VALUES (v_year, 0)
    ON CONFLICT (year) DO NOTHING;

    -- Process jobs pending for the given date, ordered by uid ASC
    FOR v_job IN
        SELECT id, uid
        FROM job_entry_tests
        WHERE date_of_testing = p_date
          AND ulr_status = 'pending'
        ORDER BY uid ASC
    LOOP
        -- Lock and update counter
        UPDATE ulr_yearly_counters
        SET last_seq = last_seq + 1
        WHERE year = v_year
        RETURNING last_seq INTO v_seq;

        -- Update the job entry
        UPDATE job_entry_tests
        SET ulr_seq = v_seq,
            ulr_year = v_year,
            ulr_number = 'TC-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0'),
            ulr_generated_at = NOW(),
            ulr_status = 'generated'
        WHERE id = v_job.id;
    END LOOP;
END;
$$;
