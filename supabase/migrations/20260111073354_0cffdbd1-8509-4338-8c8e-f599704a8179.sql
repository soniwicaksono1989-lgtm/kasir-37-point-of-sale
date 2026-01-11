-- Add deposit_balance column to customers table
ALTER TABLE public.customers 
ADD COLUMN deposit_balance numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.customers.deposit_balance IS 'Saldo titip dana customer yang bisa digunakan untuk membayar invoice';

-- Create deposit_logs table for tracking deposit history
CREATE TABLE public.deposit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'deposit', -- 'deposit' for incoming, 'usage' for payment allocation
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.deposit_logs IS 'Log transaksi titip dana customer';

-- Enable RLS on deposit_logs
ALTER TABLE public.deposit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposit_logs
CREATE POLICY "Authenticated users can view deposit_logs"
ON public.deposit_logs
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert deposit_logs"
ON public.deposit_logs
FOR INSERT
WITH CHECK (true);

-- Create payment_allocations table for tracking multi-invoice payments
CREATE TABLE public.payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_allocations IS 'Alokasi pembayaran ke berbagai invoice';

-- Enable RLS on payment_allocations
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_allocations
CREATE POLICY "Authenticated users can view payment_allocations"
ON public.payment_allocations
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert payment_allocations"
ON public.payment_allocations
FOR INSERT
WITH CHECK (true);