-- 20260921000002_add_casting_testing_dates.sql

ALTER TABLE public.job_entry_tests
ADD COLUMN date_of_receiving DATE,
ADD COLUMN date_of_casting DATE,
ADD COLUMN testing_age TEXT,
ADD COLUMN date_of_testing DATE,
ADD COLUMN material_description TEXT;
