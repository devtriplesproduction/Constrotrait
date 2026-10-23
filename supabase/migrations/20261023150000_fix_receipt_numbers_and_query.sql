-- 20261023150000_fix_receipt_numbers_and_query.sql
-- Fix next_receipt_no to properly handle null branch_id and maintain serial numbering

CREATE OR REPLACE FUNCTION public.next_receipt_no(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fy text;
  seq int;
  result text;
BEGIN
  fy := to_char(CURRENT_DATE, 'YYYY') || '-' || to_char(CURRENT_DATE + interval '1 year', 'YY');
  IF EXTRACT(MONTH FROM CURRENT_DATE) < 4 THEN
    fy := to_char(CURRENT_DATE - interval '1 year', 'YYYY') || '-' || to_char(CURRENT_DATE, 'YY');
  END IF;
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_no FROM '[0-9]+$') AS int)), 0) + 1 INTO seq
  FROM public.inward_receipts
  WHERE branch_id IS NOT DISTINCT FROM p_branch_id
    AND receipt_no LIKE 'REC/' || fy || '/%';
  result := 'REC/' || fy || '/' || LPAD(seq::text, 4, '0');
  RETURN result;
END;
$$;
