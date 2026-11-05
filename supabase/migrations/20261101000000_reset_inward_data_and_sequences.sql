-- Migration: 20261101000000_reset_inward_data_and_sequences.sql
-- Description: Reset inward test data, clients, and initialize sequence counters according to client requirement:
--   1. Reset inward number to start from 3188 onwards (UID_NABL initialized to 3187).
--   2. Continue allotment sample code sequence from next number onwards (currently at 859 -> next is 860; SAMPLE_CON and SAMPLE_ENV initialized to 859).
--   3. Delete all test inward records, tests, assignments, reports, queues, linked test invoices/receipts/expenses, and test clients.

BEGIN;

-- 1. Unlink any quotations referencing job_entries or clients
UPDATE public.quotations 
SET inward_id = NULL, client_id = NULL 
WHERE inward_id IS NOT NULL OR client_id IS NOT NULL;

-- 2. Unlink any accounting projects referencing clients
UPDATE public.accounting_projects 
SET client_id = NULL 
WHERE client_id IS NOT NULL;

-- 3. Clear accounting audit logs for test inwards/receipts/expenses
DELETE FROM public.accounting_audit_log 
WHERE table_name IN ('inward_receipts', 'accounting_expenses', 'invoices', 'invoice_payments');

-- 4. Clear invoice payments first (references inward_receipts.id and invoices.id)
DELETE FROM public.invoice_payments;

-- 5. Clear test invoices linked to inwards
DELETE FROM public.invoices;

-- 6. Clear inward receipts generated during testing
DELETE FROM public.inward_receipts;

-- 7. Clear test accounting expenses tied to inward records
DELETE FROM public.accounting_expenses 
WHERE expense_type = 'inward' 
   OR inward_id IS NOT NULL;

-- 8. Clear lab reports, report lines, and ULR queue
DELETE FROM public.lab_report_lines;
DELETE FROM public.lab_reports;
DELETE FROM public.ulr_generation_queue;

-- 9. Clear job assignments and test result rows
DELETE FROM public.test_results;
DELETE FROM public.job_assignments;

-- 10. Clear all job entry tests and job entries (inward transactional records)
DELETE FROM public.job_entry_tests;
DELETE FROM public.job_entries;

-- 11. Clear all test clients
DELETE FROM public.clients;

-- 12. Reset and set sequence counters in lab_uid_counters
-- Delete old temporary/test counters from testing phase
DELETE FROM public.lab_uid_counters 
WHERE counter_name IN ('UID_APR', 'UID_SEP', 'UID_OCT', 'TEST2');

-- Inward Number: current is 3187, so software will start from 3188 onwards
INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
VALUES ('UID_NABL', 2026, 3187)
ON CONFLICT (counter_name, counter_year)
DO UPDATE SET counter_value = 3187;

-- Allotment Sample Code: running at 859, so continue from next number (860) onwards
INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
VALUES ('SAMPLE_CON', 2026, 859)
ON CONFLICT (counter_name, counter_year)
DO UPDATE SET counter_value = 859;

INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
VALUES ('SAMPLE_ENV', 2026, 859)
ON CONFLICT (counter_name, counter_year)
DO UPDATE SET counter_value = 859;

-- 13. Reset report yearly counter for 2026 so real reports start fresh from 1
UPDATE public.report_yearly_counters 
SET last_seq = 0 
WHERE year = 2026;

COMMIT;
