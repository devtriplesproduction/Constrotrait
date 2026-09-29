-- Move 'uid' from job_entry_tests to job_entries

-- 1. Add 'uid' to job_entries
ALTER TABLE job_entries ADD COLUMN uid BIGINT UNIQUE;

-- 2. Populate 'uid' for existing job_entries based on the max uid of their tests (optional but good practice)
-- (If there is no strict requirement for backfilling, we can just leave it NULL or generate new ones, but let's try to preserve it)
UPDATE job_entries
SET uid = (
    SELECT MAX(uid) 
    FROM job_entry_tests 
    WHERE job_entry_tests.job_entry_id = job_entries.id
);

-- 3. For any job_entries that didn't have tests, we might want a default or just leave them null
-- 4. Drop 'uid' from job_entry_tests
ALTER TABLE job_entry_tests DROP COLUMN uid;
