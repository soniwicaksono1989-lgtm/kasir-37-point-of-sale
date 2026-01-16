// Supabase Data Management System
// Replaces localStorage for cloud-based data persistence

import { supabase } from '@/integrations/supabase/client';
import { Product, Customer, Transaction, TransactionItem, Expense, Payment, DepositLog, PaymentAllocation } from '@/types/database';

// Store Settings Type
export interface StoreSettings {
  id: string;
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== PRODUCTS ====================
export const productsStorage = {
  getAll: async (): Promise<Product[]> => {
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Product[];
  },
  
  getById: async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase!
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as Product | null;
  },
  
  create: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> => {
    const { data, error } = await supabase!
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },
  
  update: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    const { data, error } = await supabase!
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Product;
  },
  
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase!
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },
};

// ==================== CUSTOMERS ====================
export const customersStorage = {
  getAll: async (): Promise<Customer[]> => {
    const { data, error } = await supabase!
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []) as Customer[];
  },
  
  getById: async (id: string): Promise<Customer | null> => {
    const { data, error } = await supabase!
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as Customer | null;
  },
  
  search: async (query: string): Promise<Customer[]> => {
    const { data, error } = await supabase!
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);
    
    if (error) throw error;
    return (data || []) as Customer[];
  },
  
  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const { data, error } = await supabase!
      .from('customers')
      .insert(customer)
      .select()
      .single();
    
    if (error) throw error;
    return data as Customer;
  },
  
  update: async (id: string, updates: Partial<Customer>): Promise<Customer | null> => {
    const { data, error } = await supabase!
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Customer;
  },
  
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase!
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },
  
  updateBalance: async (id: string, amount: number): Promise<Customer | null> => {
    const customer = await customersStorage.getById(id);
    if (!customer) return null;
    return customersStorage.update(id, { 
      deposit_balance: customer.deposit_balance + amount 
    });
  },
};

// ==================== TRANSACTIONS ====================
export const transactionsStorage = {
  getAll: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase!
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Transaction[];
  },
  
  getById: async (id: string): Promise<Transaction | null> => {
    const { data, error } = await supabase!
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as Transaction | null;
  },
  
  getByDateRange: async (startDate: string, endDate: string): Promise<Transaction[]> => {
    const { data, error } = await supabase!
      .from('transactions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Transaction[];
  },
  
  create: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>): Promise<Transaction> => {
    // Generate invoice number using Supabase function
    const { data: invoiceData, error: invoiceError } = await supabase!
      .rpc('generate_invoice_number');
    
    if (invoiceError) throw invoiceError;
    
    const { data, error } = await supabase!
      .from('transactions')
      .insert({
        ...transaction,
        invoice_number: invoiceData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Transaction;
  },
  
  update: async (id: string, updates: Partial<Transaction>): Promise<Transaction | null> => {
    const { data, error } = await supabase!
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Transaction;
  },
  
  delete: async (id: string): Promise<boolean> => {
    // First delete related items
    await transactionItemsStorage.deleteByTransactionId(id);
    await paymentsStorage.deleteByTransactionId(id);
    
    const { error } = await supabase!
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },
};

// ==================== TRANSACTION ITEMS ====================
export const transactionItemsStorage = {
  getAll: async (): Promise<TransactionItem[]> => {
    const { data, error } = await supabase!
      .from('transaction_items')
      .select('*');
    
    if (error) throw error;
    return (data || []) as TransactionItem[];
  },
  
  getByTransactionId: async (transactionId: string): Promise<TransactionItem[]> => {
    const { data, error } = await supabase!
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transactionId);
    
    if (error) throw error;
    return (data || []) as TransactionItem[];
  },
  
  create: async (item: Omit<TransactionItem, 'id' | 'created_at'>): Promise<TransactionItem> => {
    const { data, error } = await supabase!
      .from('transaction_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data as TransactionItem;
  },
  
  createMany: async (items: Omit<TransactionItem, 'id' | 'created_at'>[]): Promise<TransactionItem[]> => {
    const { data, error } = await supabase!
      .from('transaction_items')
      .insert(items)
      .select();
    
    if (error) throw error;
    return (data || []) as TransactionItem[];
  },
  
  deleteByTransactionId: async (transactionId: string): Promise<void> => {
    const { error } = await supabase!
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transactionId);
    
    if (error) throw error;
  },
};

// ==================== EXPENSES ====================
export const expensesStorage = {
  getAll: async (): Promise<Expense[]> => {
    const { data, error } = await supabase!
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Expense[];
  },
  
  getByDateRange: async (startDate: string, endDate: string): Promise<Expense[]> => {
    const { data, error } = await supabase!
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Expense[];
  },
  
  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const { data, error } = await supabase!
      .from('expenses')
      .insert(expense)
      .select()
      .single();
    
    if (error) throw error;
    return data as Expense;
  },
  
  update: async (id: string, updates: Partial<Expense>): Promise<Expense | null> => {
    const { data, error } = await supabase!
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Expense;
  },
  
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase!
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },
};

// ==================== PAYMENTS ====================
export const paymentsStorage = {
  getAll: async (): Promise<Payment[]> => {
    const { data, error } = await supabase!
      .from('payments')
      .select('*');
    
    if (error) throw error;
    return (data || []) as Payment[];
  },
  
  getByTransactionId: async (transactionId: string): Promise<Payment[]> => {
    const { data, error } = await supabase!
      .from('payments')
      .select('*')
      .eq('transaction_id', transactionId);
    
    if (error) throw error;
    return (data || []) as Payment[];
  },
  
  create: async (payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> => {
    const { data, error } = await supabase!
      .from('payments')
      .insert(payment)
      .select()
      .single();
    
    if (error) throw error;
    return data as Payment;
  },
  
  deleteByTransactionId: async (transactionId: string): Promise<void> => {
    const { error } = await supabase!
      .from('payments')
      .delete()
      .eq('transaction_id', transactionId);
    
    if (error) throw error;
  },
};

// ==================== DEPOSIT LOGS ====================
export const depositLogsStorage = {
  getAll: async (): Promise<DepositLog[]> => {
    const { data, error } = await supabase!
      .from('deposit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as DepositLog[];
  },
  
  getByCustomerId: async (customerId: string): Promise<DepositLog[]> => {
    const { data, error } = await supabase!
      .from('deposit_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as DepositLog[];
  },
  
  create: async (log: Omit<DepositLog, 'id' | 'created_at'>): Promise<DepositLog> => {
    const { data, error } = await supabase!
      .from('deposit_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) throw error;
    return data as DepositLog;
  },
};

// ==================== PAYMENT ALLOCATIONS ====================
export const paymentAllocationsStorage = {
  getAll: async (): Promise<PaymentAllocation[]> => {
    const { data, error } = await supabase!
      .from('payment_allocations')
      .select('*');
    
    if (error) throw error;
    return (data || []) as PaymentAllocation[];
  },
  
  getByPaymentId: async (paymentId: string): Promise<PaymentAllocation[]> => {
    const { data, error } = await supabase!
      .from('payment_allocations')
      .select('*')
      .eq('payment_id', paymentId);
    
    if (error) throw error;
    return (data || []) as PaymentAllocation[];
  },
  
  create: async (allocation: Omit<PaymentAllocation, 'id' | 'created_at'>): Promise<PaymentAllocation> => {
    const { data, error } = await supabase!
      .from('payment_allocations')
      .insert(allocation)
      .select()
      .single();
    
    if (error) throw error;
    return data as PaymentAllocation;
  },
};

// ==================== STORE SETTINGS ====================
export const storeSettingsStorage = {
  get: async (): Promise<StoreSettings> => {
    const { data, error } = await supabase!
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      // Create default settings if none exist
      const defaultSettings = {
        store_name: 'KASIR 37',
        address: null,
        phone: null,
        logo_url: null,
        bank_name: null,
        bank_account_number: null,
        bank_account_name: null,
      };
      
      const { data: newData, error: insertError } = await supabase!
        .from('store_settings')
        .insert(defaultSettings)
        .select()
        .single();
      
      if (insertError) throw insertError;
      return newData as StoreSettings;
    }
    
    return data as StoreSettings;
  },
  
  update: async (updates: Partial<StoreSettings>): Promise<StoreSettings> => {
    // First get the current settings to get the ID
    const current = await storeSettingsStorage.get();
    
    const { data, error } = await supabase!
      .from('store_settings')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as StoreSettings;
  },
};

// ==================== UTILITY FUNCTIONS ====================
export const dataUtils = {
  // Export all data for backup
  exportAllData: async () => {
    const [products, customers, transactions, transactionItems, expenses, payments, depositLogs, paymentAllocations, storeSettings] = await Promise.all([
      productsStorage.getAll(),
      customersStorage.getAll(),
      transactionsStorage.getAll(),
      transactionItemsStorage.getAll(),
      expensesStorage.getAll(),
      paymentsStorage.getAll(),
      depositLogsStorage.getAll(),
      paymentAllocationsStorage.getAll(),
      storeSettingsStorage.get(),
    ]);
    
    return {
      products,
      customers,
      transactions,
      transactionItems,
      expenses,
      payments,
      depositLogs,
      paymentAllocations,
      storeSettings,
      exportedAt: new Date().toISOString(),
    };
  },
};
