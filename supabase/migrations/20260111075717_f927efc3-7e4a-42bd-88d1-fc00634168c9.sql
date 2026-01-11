-- =============================================
-- ADD SERVER-SIDE INPUT VALIDATION CONSTRAINTS
-- =============================================

-- Products: Ensure prices and stock are non-negative
ALTER TABLE public.products 
  ADD CONSTRAINT products_price_reseller_positive CHECK (price_reseller >= 0),
  ADD CONSTRAINT products_price_end_user_positive CHECK (price_end_user >= 0),
  ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);

-- Products: Name length limit
ALTER TABLE public.products 
  ADD CONSTRAINT products_name_length CHECK (length(name) <= 200);

-- Customers: Name length limit
ALTER TABLE public.customers 
  ADD CONSTRAINT customers_name_length CHECK (length(name) <= 200);

-- Customers: Deposit balance non-negative
ALTER TABLE public.customers 
  ADD CONSTRAINT customers_deposit_non_negative CHECK (deposit_balance >= 0);

-- Transactions: Amounts must be non-negative
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_total_price_non_negative CHECK (total_price >= 0),
  ADD CONSTRAINT transactions_amount_paid_non_negative CHECK (amount_paid >= 0);

-- Transaction Items: Quantity must be positive, prices non-negative
ALTER TABLE public.transaction_items 
  ADD CONSTRAINT transaction_items_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT transaction_items_unit_price_non_negative CHECK (unit_price >= 0),
  ADD CONSTRAINT transaction_items_subtotal_non_negative CHECK (subtotal >= 0);

-- Payments: Amount must be positive
ALTER TABLE public.payments 
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

-- Payment Allocations: Amount must be positive
ALTER TABLE public.payment_allocations 
  ADD CONSTRAINT payment_allocations_amount_positive CHECK (amount > 0);

-- Deposit Logs: Amount must be positive
ALTER TABLE public.deposit_logs 
  ADD CONSTRAINT deposit_logs_amount_positive CHECK (amount > 0);

-- Expenses: Amount must be positive
ALTER TABLE public.expenses 
  ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT expenses_description_length CHECK (length(description) <= 500);