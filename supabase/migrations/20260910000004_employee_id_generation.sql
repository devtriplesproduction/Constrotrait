-- Migration: 20260910000004_employee_id_generation.sql
-- Description: Adds sequential branch numbering and employee ID generation

-- 1. Add sequential branch_number to branches
ALTER TABLE public.branches ADD COLUMN branch_number SERIAL UNIQUE;

-- 2. Create sequence tracking table
CREATE TABLE IF NOT EXISTS public.branch_employee_sequences (
    branch_id UUID PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
    current_value INT DEFAULT 0
);

-- 3. Backfill sequences for existing branches based on current employee count
INSERT INTO public.branch_employee_sequences (branch_id, current_value)
SELECT b.id, COUNT(p.id)
FROM public.branches b
LEFT JOIN public.profiles p ON p.branch_id = b.id
GROUP BY b.id
ON CONFLICT (branch_id) DO UPDATE SET current_value = EXCLUDED.current_value;

-- 4. Create trigger to automatically add sequence row for new branches
CREATE OR REPLACE FUNCTION public.handle_new_branch_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.branch_employee_sequences (branch_id, current_value)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_new_branch_sequence ON public.branches;
CREATE TRIGGER trigger_new_branch_sequence
AFTER INSERT ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_branch_sequence();

-- 5. Create RPC to generate the next Employee ID safely
CREATE OR REPLACE FUNCTION public.generate_employee_id(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_branch_number INT;
    v_next_emp_number INT;
BEGIN
    IF p_branch_id IS NULL THEN
        RAISE EXCEPTION 'Branch ID is required to generate an employee ID.';
    END IF;

    -- Atomically lock and increment the sequence
    UPDATE public.branch_employee_sequences
    SET current_value = current_value + 1
    WHERE branch_id = p_branch_id
    RETURNING current_value INTO v_next_emp_number;
    
    IF v_next_emp_number IS NULL THEN
        RAISE EXCEPTION 'Branch sequence not found for branch_id %', p_branch_id;
    END IF;
    
    SELECT branch_number INTO v_branch_number 
    FROM public.branches 
    WHERE id = p_branch_id;
    
    IF v_branch_number IS NULL THEN
        RAISE EXCEPTION 'Branch not found';
    END IF;
    
    -- Format: CMTS-{2-digit branch}-{employee number}
    RETURN 'CMTS-' || LPAD(v_branch_number::TEXT, 2, '0') || '-' || v_next_emp_number::TEXT;
END;
$$;

-- Grant execution privileges to authenticated users (admin/HR)
GRANT EXECUTE ON FUNCTION public.generate_employee_id(UUID) TO authenticated;
