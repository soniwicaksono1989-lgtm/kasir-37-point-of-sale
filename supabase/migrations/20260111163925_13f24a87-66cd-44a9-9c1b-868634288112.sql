-- Create a secure function to delete transaction with stock restoration and deposit refund
-- Only admin can execute this function (enforced via RLS and function security)

CREATE OR REPLACE FUNCTION public.delete_transaction_with_cleanup(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_item RECORD;
  v_deposit_payment RECORD;
  v_total_deposit_refund numeric := 0;
  v_items_restored integer := 0;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin can delete transactions';
  END IF;

  -- Get transaction details
  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Step 1: Restore stock for each transaction item
  FOR v_item IN 
    SELECT ti.*, p.category, p.unit
    FROM public.transaction_items ti
    LEFT JOIN public.products p ON p.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      -- For products with stock (Stok category or pcs/lembar/box units)
      IF v_item.category = 'Stok' OR v_item.unit IN ('pcs', 'lembar', 'box') THEN
        UPDATE public.products
        SET stock = stock + v_item.quantity,
            updated_at = now()
        WHERE id = v_item.product_id;
        v_items_restored := v_items_restored + 1;
      END IF;
    END IF;
  END LOOP;

  -- Step 2: Find and refund deposit payments
  -- Check payments that used deposit (via deposit_logs with type 'usage' linked by notes containing transaction id)
  FOR v_deposit_payment IN
    SELECT dl.customer_id, dl.amount
    FROM public.deposit_logs dl
    WHERE dl.type = 'usage' 
      AND dl.notes LIKE '%' || v_transaction.invoice_number || '%'
  LOOP
    -- Refund the deposit to customer
    UPDATE public.customers
    SET deposit_balance = deposit_balance + v_deposit_payment.amount,
        updated_at = now()
    WHERE id = v_deposit_payment.customer_id;
    
    -- Log the refund
    INSERT INTO public.deposit_logs (customer_id, amount, type, notes, created_by)
    VALUES (
      v_deposit_payment.customer_id,
      v_deposit_payment.amount,
      'refund',
      'Refund dari penghapusan transaksi ' || v_transaction.invoice_number,
      auth.uid()
    );
    
    v_total_deposit_refund := v_total_deposit_refund + v_deposit_payment.amount;
  END LOOP;

  -- Step 3: Delete payment allocations (cascade should handle this, but explicit for safety)
  DELETE FROM public.payment_allocations
  WHERE payment_id IN (
    SELECT id FROM public.payments WHERE transaction_id = p_transaction_id
  );

  -- Step 4: Delete payments
  DELETE FROM public.payments
  WHERE transaction_id = p_transaction_id;

  -- Step 5: Delete related deposit_logs for this transaction
  DELETE FROM public.deposit_logs
  WHERE notes LIKE '%' || v_transaction.invoice_number || '%'
    AND type = 'usage';

  -- Step 6: Delete transaction items
  DELETE FROM public.transaction_items
  WHERE transaction_id = p_transaction_id;

  -- Step 7: Delete the transaction
  DELETE FROM public.transactions
  WHERE id = p_transaction_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'invoice_number', v_transaction.invoice_number,
    'items_restored', v_items_restored,
    'deposit_refunded', v_total_deposit_refund
  );

  RETURN v_result;
END;
$$;