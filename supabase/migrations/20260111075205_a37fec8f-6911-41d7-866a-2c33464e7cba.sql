-- =============================================
-- FIX: Implement Role-Based RLS Policies
-- =============================================
-- Admin: Full access to all data
-- Kasir: Limited to POS operations (view products/customers, manage own transactions)

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
-- Kasir needs to view customers to select at POS, but only admin can modify

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

-- Admin can do everything with customers
CREATE POLICY "Admin can manage customers" ON public.customers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can only view customers (needed for POS customer selection)
CREATE POLICY "Kasir can view customers" ON public.customers
  FOR SELECT USING (has_role(auth.uid(), 'kasir'::app_role));

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON public.transactions;

-- Admin can do everything with transactions
CREATE POLICY "Admin can manage transactions" ON public.transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can view only their own transactions
CREATE POLICY "Kasir can view own transactions" ON public.transactions
  FOR SELECT USING (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- Kasir can create transactions (they set created_by to their uid)
CREATE POLICY "Kasir can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- Kasir can update only their own transactions
CREATE POLICY "Kasir can update own transactions" ON public.transactions
  FOR UPDATE USING (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- =============================================
-- TRANSACTION ITEMS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can view transaction_items" ON public.transaction_items;

-- Admin can do everything
CREATE POLICY "Admin can manage transaction_items" ON public.transaction_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can view items for their own transactions only
CREATE POLICY "Kasir can view own transaction_items" ON public.transaction_items
  FOR SELECT USING (
    has_role(auth.uid(), 'kasir'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_items.transaction_id 
      AND t.created_by = auth.uid()
    )
  );

-- Kasir can insert items for their own transactions
CREATE POLICY "Kasir can insert transaction_items" ON public.transaction_items
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'kasir'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_items.transaction_id 
      AND t.created_by = auth.uid()
    )
  );

-- =============================================
-- PAYMENTS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;

-- Admin can do everything
CREATE POLICY "Admin can manage payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can view only their own payments
CREATE POLICY "Kasir can view own payments" ON public.payments
  FOR SELECT USING (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- Kasir can create payments (for their own transactions)
CREATE POLICY "Kasir can create payments" ON public.payments
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- =============================================
-- PAYMENT ALLOCATIONS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view payment_allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Authenticated users can insert payment_allocations" ON public.payment_allocations;

-- Admin can do everything
CREATE POLICY "Admin can manage payment_allocations" ON public.payment_allocations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can view allocations for their own payments
CREATE POLICY "Kasir can view own payment_allocations" ON public.payment_allocations
  FOR SELECT USING (
    has_role(auth.uid(), 'kasir'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.id = payment_allocations.payment_id 
      AND p.created_by = auth.uid()
    )
  );

-- Kasir can insert allocations for their own payments
CREATE POLICY "Kasir can insert payment_allocations" ON public.payment_allocations
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'kasir'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.id = payment_allocations.payment_id 
      AND p.created_by = auth.uid()
    )
  );

-- =============================================
-- DEPOSIT LOGS TABLE
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view deposit_logs" ON public.deposit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert deposit_logs" ON public.deposit_logs;

-- Admin can do everything with deposit logs
CREATE POLICY "Admin can manage deposit_logs" ON public.deposit_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Kasir can view only their own deposit logs
CREATE POLICY "Kasir can view own deposit_logs" ON public.deposit_logs
  FOR SELECT USING (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- Kasir can insert deposit logs (for deposits they process)
CREATE POLICY "Kasir can insert deposit_logs" ON public.deposit_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'kasir'::app_role) AND auth.uid() = created_by);

-- =============================================
-- PRODUCTS TABLE - Already has good policies, just verify
-- =============================================
-- products already has "Admin can manage products" and "Authenticated users can view products"
-- Keep view access for kasir as they need product list for POS

-- =============================================
-- STORE SETTINGS TABLE - Already has good policies
-- =============================================
-- store_settings already has "Admin can manage store settings" and "Authenticated users can view store settings"
-- This is intentionally public for invoice display