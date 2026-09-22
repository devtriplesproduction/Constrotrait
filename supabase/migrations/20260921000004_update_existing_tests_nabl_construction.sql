-- 20260921000004_update_existing_tests_nabl_construction.sql

UPDATE public.test_master
SET 
  is_nabl = true,
  category = 'Construction'
WHERE id IS NOT NULL;
