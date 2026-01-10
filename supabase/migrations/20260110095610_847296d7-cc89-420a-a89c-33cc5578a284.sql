-- Fix function search path for generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  today_str TEXT;
  seq_num INTEGER;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.transactions
  WHERE invoice_number LIKE 'INV' || today_str || '%';
  
  RETURN 'INV' || today_str || LPAD(seq_num::TEXT, 4, '0');
END;
$$;