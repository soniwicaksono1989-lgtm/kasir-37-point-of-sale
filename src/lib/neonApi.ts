// API client for Netlify Functions connected to Neon PostgreSQL

const API_BASE = '/api';

// Generic fetch helper
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  
  return response.json();
}

// Products API
export const productsApi = {
  getAll: () => fetchApi<any[]>('/products'),
  getById: (id: string) => fetchApi<any>(`/products/${id}`),
  create: (data: any) => fetchApi<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchApi<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<any>(`/products/${id}`, { method: 'DELETE' }),
};

// Customers API
export const customersApi = {
  getAll: () => fetchApi<any[]>('/customers'),
  getById: (id: string) => fetchApi<any>(`/customers/${id}`),
  search: (query: string) => fetchApi<any[]>(`/customers?search=${encodeURIComponent(query)}`),
  create: (data: any) => fetchApi<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchApi<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<any>(`/customers/${id}`, { method: 'DELETE' }),
};

// Transactions API
export const transactionsApi = {
  getAll: () => fetchApi<any[]>('/transactions'),
  getById: (id: string) => fetchApi<any>(`/transactions/${id}`),
  getByDateRange: (startDate: string, endDate: string) => 
    fetchApi<any[]>(`/transactions?start_date=${startDate}&end_date=${endDate}`),
  create: (data: any) => fetchApi<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchApi<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<any>(`/transactions/${id}`, { method: 'DELETE' }),
};

// Transaction Items API
export const transactionItemsApi = {
  getByTransactionId: (transactionId: string) => 
    fetchApi<any[]>(`/transaction-items?transaction_id=${transactionId}`),
  create: (data: any) => fetchApi<any>('/transaction-items', { method: 'POST', body: JSON.stringify(data) }),
  deleteByTransactionId: (transactionId: string) => 
    fetchApi<any>(`/transaction-items?transaction_id=${transactionId}`, { method: 'DELETE' }),
};

// Expenses API
export const expensesApi = {
  getAll: () => fetchApi<any[]>('/expenses'),
  getById: (id: string) => fetchApi<any>(`/expenses/${id}`),
  getByDateRange: (startDate: string, endDate: string) => 
    fetchApi<any[]>(`/expenses?start_date=${startDate}&end_date=${endDate}`),
  create: (data: any) => fetchApi<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchApi<any>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<any>(`/expenses/${id}`, { method: 'DELETE' }),
};

// Payments API
export const paymentsApi = {
  getByTransactionId: (transactionId: string) => 
    fetchApi<any[]>(`/payments?transaction_id=${transactionId}`),
  create: (data: any) => fetchApi<any>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<any>(`/payments?id=${id}`, { method: 'DELETE' }),
};

// Deposit Logs API
export const depositLogsApi = {
  getByCustomerId: (customerId: string) => 
    fetchApi<any[]>(`/deposit-logs?customer_id=${customerId}`),
  create: (data: any) => fetchApi<any>('/deposit-logs', { method: 'POST', body: JSON.stringify(data) }),
};

// Store Settings API
export const storeSettingsApi = {
  get: () => fetchApi<any>('/store-settings'),
  update: (data: any) => fetchApi<any>('/store-settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// Initialize database
export const initDatabase = () => fetchApi<any>('/init-db', { method: 'POST' });

// Export all APIs
export const neonApi = {
  products: productsApi,
  customers: customersApi,
  transactions: transactionsApi,
  transactionItems: transactionItemsApi,
  expenses: expensesApi,
  payments: paymentsApi,
  depositLogs: depositLogsApi,
  storeSettings: storeSettingsApi,
  initDatabase,
};

export default neonApi;
