-- Add discount_amount column to transactions table
ALTER TABLE public.transactions
ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- Add check constraint to ensure discount is not negative
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_discount_amount_check CHECK (discount_amount >= 0);