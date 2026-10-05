-- Migration to drop foreign key constraints on report_qr and datasheet_qr

ALTER TABLE public.test_master 
  DROP CONSTRAINT IF EXISTS test_master_report_qr_fkey,
  DROP CONSTRAINT IF EXISTS test_master_datasheet_qr_fkey;
