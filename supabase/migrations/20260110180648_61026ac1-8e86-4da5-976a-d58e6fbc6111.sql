-- Update the generate_invoice_number function to use new format
-- Format: INV-37CONCEPT-{YYYYMMDD}-{RUNNING_NUMBER} (5 digits)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  today_str TEXT;
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  prefix := 'INV-37CONCEPT-' || today_str || '-';
  
  -- Find the last invoice number for today and extract the sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 1) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.transactions
  WHERE invoice_number LIKE prefix || '%';
  
  RETURN prefix || LPAD(seq_num::TEXT, 5, '0');
END;
$function$;