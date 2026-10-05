CREATE TABLE IF NOT EXISTS public.lab_uid_counters (
    counter_name TEXT NOT NULL,
    counter_year INT NOT NULL,
    counter_value INT NOT NULL DEFAULT 0,
    PRIMARY KEY (counter_name, counter_year)
);

-- Enable RLS but don't add policies so it defaults to deny-all from frontend
ALTER TABLE public.lab_uid_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_uid_seq(p_name text, p_year int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO public.lab_uid_counters (counter_name, counter_year, counter_value)
  VALUES (p_name, p_year, 1)
  ON CONFLICT (counter_name, counter_year)
  DO UPDATE SET counter_value = public.lab_uid_counters.counter_value + 1
  RETURNING counter_value INTO v_next;

  RETURN v_next;
END;
$$;
