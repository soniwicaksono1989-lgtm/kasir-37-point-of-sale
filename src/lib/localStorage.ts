// LocalStorage Data Management System
// Replaces Supabase for offline-first data persistence

import { Product, Customer, Transaction, TransactionItem, Expense, Payment, DepositLog, PaymentAllocation } from '@/types/database';

// Storage Keys
const STORAGE_KEYS = {
  PRODUCTS: 'kasir37_products',
  CUSTOMERS: 'kasir37_customers',
  TRANSACTIONS: 'kasir37_transactions',
  TRANSACTION_ITEMS: 'kasir37_transaction_items',
  EXPENSES: 'kasir37_expenses',
  PAYMENTS: 'kasir37_payments',
  DEPOSIT_LOGS: 'kasir37_deposit_logs',
  PAYMENT_ALLOCATIONS: 'kasir37_payment_allocations',
  STORE_SETTINGS: 'kasir37_store_settings',
  INVOICE_COUNTER: 'kasir37_invoice_counter',
} as const;

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

// Generic get/set helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
}

// Generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Generate Invoice Number
export function generateInvoiceNumber(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const counter = getFromStorage<number>(STORAGE_KEYS.INVOICE_COUNTER, 0) + 1;
  setToStorage(STORAGE_KEYS.INVOICE_COUNTER, counter);
  return `INV-37CONCEPT-${dateStr}-${counter.toString().padStart(5, '0')}`;
}

// ==================== PRODUCTS ====================
export const productsStorage = {
  getAll: (): Product[] => getFromStorage(STORAGE_KEYS.PRODUCTS, []),
  
  getById: (id: string): Product | undefined => {
    const products = productsStorage.getAll();
    return products.find(p => p.id === id);
  },
  
  create: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product => {
    const products = productsStorage.getAll();
    const newProduct: Product = {
      ...product,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    products.push(newProduct);
    setToStorage(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },
  
  update: (id: string, updates: Partial<Product>): Product | null => {
    const products = productsStorage.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    products[index] = {
      ...products[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.PRODUCTS, products);
    return products[index];
  },
  
  delete: (id: string): boolean => {
    const products = productsStorage.getAll();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    setToStorage(STORAGE_KEYS.PRODUCTS, filtered);
    return true;
  },
};

// ==================== CUSTOMERS ====================
export const customersStorage = {
  getAll: (): Customer[] => getFromStorage(STORAGE_KEYS.CUSTOMERS, []),
  
  getById: (id: string): Customer | undefined => {
    const customers = customersStorage.getAll();
    return customers.find(c => c.id === id);
  },
  
  search: (query: string): Customer[] => {
    const customers = customersStorage.getAll();
    const lowerQuery = query.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
  },
  
  create: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Customer => {
    const customers = customersStorage.getAll();
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    customers.push(newCustomer);
    setToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  },
  
  update: (id: string, updates: Partial<Customer>): Customer | null => {
    const customers = customersStorage.getAll();
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    customers[index] = {
      ...customers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[index];
  },
  
  delete: (id: string): boolean => {
    const customers = customersStorage.getAll();
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length === customers.length) return false;
    setToStorage(STORAGE_KEYS.CUSTOMERS, filtered);
    return true;
  },
  
  updateBalance: (id: string, amount: number): Customer | null => {
    const customer = customersStorage.getById(id);
    if (!customer) return null;
    return customersStorage.update(id, { 
      deposit_balance: customer.deposit_balance + amount 
    });
  },
};

// ==================== TRANSACTIONS ====================
export const transactionsStorage = {
  getAll: (): Transaction[] => {
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    return transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  
  getById: (id: string): Transaction | undefined => {
    const transactions = transactionsStorage.getAll();
    return transactions.find(t => t.id === id);
  },
  
  getByDateRange: (startDate: string, endDate: string): Transaction[] => {
    const transactions = transactionsStorage.getAll();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000; // Include end date
    
    return transactions.filter(t => {
      const date = new Date(t.created_at).getTime();
      return date >= start && date < end;
    });
  },
  
  create: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'invoice_number'>): Transaction => {
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      invoice_number: generateInvoiceNumber(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    transactions.push(newTransaction);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    return newTransaction;
  },
  
  update: (id: string, updates: Partial<Transaction>): Transaction | null => {
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    transactions[index] = {
      ...transactions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    return transactions[index];
  },
  
  delete: (id: string): boolean => {
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const filtered = transactions.filter(t => t.id !== id);
    if (filtered.length === transactions.length) return false;
    setToStorage(STORAGE_KEYS.TRANSACTIONS, filtered);
    
    // Also delete related items
    transactionItemsStorage.deleteByTransactionId(id);
    paymentsStorage.deleteByTransactionId(id);
    
    return true;
  },
};

// ==================== TRANSACTION ITEMS ====================
export const transactionItemsStorage = {
  getAll: (): TransactionItem[] => getFromStorage(STORAGE_KEYS.TRANSACTION_ITEMS, []),
  
  getByTransactionId: (transactionId: string): TransactionItem[] => {
    const items = transactionItemsStorage.getAll();
    return items.filter(item => item.transaction_id === transactionId);
  },
  
  create: (item: Omit<TransactionItem, 'id' | 'created_at'>): TransactionItem => {
    const items = getFromStorage<TransactionItem[]>(STORAGE_KEYS.TRANSACTION_ITEMS, []);
    const newItem: TransactionItem = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    items.push(newItem);
    setToStorage(STORAGE_KEYS.TRANSACTION_ITEMS, items);
    return newItem;
  },
  
  createMany: (newItems: Omit<TransactionItem, 'id' | 'created_at'>[]): TransactionItem[] => {
    const items = getFromStorage<TransactionItem[]>(STORAGE_KEYS.TRANSACTION_ITEMS, []);
    const created = newItems.map(item => ({
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    }));
    items.push(...created);
    setToStorage(STORAGE_KEYS.TRANSACTION_ITEMS, items);
    return created;
  },
  
  deleteByTransactionId: (transactionId: string): void => {
    const items = getFromStorage<TransactionItem[]>(STORAGE_KEYS.TRANSACTION_ITEMS, []);
    const filtered = items.filter(item => item.transaction_id !== transactionId);
    setToStorage(STORAGE_KEYS.TRANSACTION_ITEMS, filtered);
  },
};

// ==================== EXPENSES ====================
export const expensesStorage = {
  getAll: (): Expense[] => {
    const expenses = getFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    return expenses.sort((a, b) => 
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  },
  
  getByDateRange: (startDate: string, endDate: string): Expense[] => {
    const expenses = expensesStorage.getAll();
    return expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
  },
  
  create: (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense => {
    const expenses = getFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expenses.push(newExpense);
    setToStorage(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  },
  
  update: (id: string, updates: Partial<Expense>): Expense | null => {
    const expenses = getFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    expenses[index] = {
      ...expenses[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.EXPENSES, expenses);
    return expenses[index];
  },
  
  delete: (id: string): boolean => {
    const expenses = getFromStorage<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const filtered = expenses.filter(e => e.id !== id);
    if (filtered.length === expenses.length) return false;
    setToStorage(STORAGE_KEYS.EXPENSES, filtered);
    return true;
  },
};

// ==================== PAYMENTS ====================
export const paymentsStorage = {
  getAll: (): Payment[] => getFromStorage(STORAGE_KEYS.PAYMENTS, []),
  
  getByTransactionId: (transactionId: string): Payment[] => {
    const payments = paymentsStorage.getAll();
    return payments.filter(p => p.transaction_id === transactionId);
  },
  
  create: (payment: Omit<Payment, 'id' | 'created_at'>): Payment => {
    const payments = getFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    payments.push(newPayment);
    setToStorage(STORAGE_KEYS.PAYMENTS, payments);
    return newPayment;
  },
  
  deleteByTransactionId: (transactionId: string): void => {
    const payments = getFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const filtered = payments.filter(p => p.transaction_id !== transactionId);
    setToStorage(STORAGE_KEYS.PAYMENTS, filtered);
  },
};

// ==================== DEPOSIT LOGS ====================
export const depositLogsStorage = {
  getAll: (): DepositLog[] => getFromStorage(STORAGE_KEYS.DEPOSIT_LOGS, []),
  
  getByCustomerId: (customerId: string): DepositLog[] => {
    const logs = depositLogsStorage.getAll();
    return logs
      .filter(log => log.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  
  create: (log: Omit<DepositLog, 'id' | 'created_at'>): DepositLog => {
    const logs = getFromStorage<DepositLog[]>(STORAGE_KEYS.DEPOSIT_LOGS, []);
    const newLog: DepositLog = {
      ...log,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    logs.push(newLog);
    setToStorage(STORAGE_KEYS.DEPOSIT_LOGS, logs);
    return newLog;
  },
};

// ==================== PAYMENT ALLOCATIONS ====================
export const paymentAllocationsStorage = {
  getAll: (): PaymentAllocation[] => getFromStorage(STORAGE_KEYS.PAYMENT_ALLOCATIONS, []),
  
  getByPaymentId: (paymentId: string): PaymentAllocation[] => {
    const allocations = paymentAllocationsStorage.getAll();
    return allocations.filter(a => a.payment_id === paymentId);
  },
  
  create: (allocation: Omit<PaymentAllocation, 'id' | 'created_at'>): PaymentAllocation => {
    const allocations = getFromStorage<PaymentAllocation[]>(STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
    const newAllocation: PaymentAllocation = {
      ...allocation,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    allocations.push(newAllocation);
    setToStorage(STORAGE_KEYS.PAYMENT_ALLOCATIONS, allocations);
    return newAllocation;
  },
};

// ==================== STORE SETTINGS ====================
export const storeSettingsStorage = {
  get: (): StoreSettings => {
    const defaultSettings: StoreSettings = {
      id: generateId(),
      store_name: 'KASIR 37',
      address: null,
      phone: null,
      logo_url: null,
      bank_name: null,
      bank_account_number: null,
      bank_account_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return getFromStorage(STORAGE_KEYS.STORE_SETTINGS, defaultSettings);
  },
  
  update: (updates: Partial<StoreSettings>): StoreSettings => {
    const current = storeSettingsStorage.get();
    const updated: StoreSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.STORE_SETTINGS, updated);
    return updated;
  },
};

// ==================== UTILITY FUNCTIONS ====================
export const dataUtils = {
  // Export all data for backup
  exportAllData: () => {
    return {
      products: productsStorage.getAll(),
      customers: customersStorage.getAll(),
      transactions: transactionsStorage.getAll(),
      transactionItems: transactionItemsStorage.getAll(),
      expenses: expensesStorage.getAll(),
      payments: paymentsStorage.getAll(),
      depositLogs: depositLogsStorage.getAll(),
      paymentAllocations: paymentAllocationsStorage.getAll(),
      storeSettings: storeSettingsStorage.get(),
      exportedAt: new Date().toISOString(),
    };
  },
  
  // Import data from backup
  importAllData: (data: ReturnType<typeof dataUtils.exportAllData>) => {
    if (data.products) setToStorage(STORAGE_KEYS.PRODUCTS, data.products);
    if (data.customers) setToStorage(STORAGE_KEYS.CUSTOMERS, data.customers);
    if (data.transactions) setToStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
    if (data.transactionItems) setToStorage(STORAGE_KEYS.TRANSACTION_ITEMS, data.transactionItems);
    if (data.expenses) setToStorage(STORAGE_KEYS.EXPENSES, data.expenses);
    if (data.payments) setToStorage(STORAGE_KEYS.PAYMENTS, data.payments);
    if (data.depositLogs) setToStorage(STORAGE_KEYS.DEPOSIT_LOGS, data.depositLogs);
    if (data.paymentAllocations) setToStorage(STORAGE_KEYS.PAYMENT_ALLOCATIONS, data.paymentAllocations);
    if (data.storeSettings) setToStorage(STORAGE_KEYS.STORE_SETTINGS, data.storeSettings);
  },
  
  // Clear all data
  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
