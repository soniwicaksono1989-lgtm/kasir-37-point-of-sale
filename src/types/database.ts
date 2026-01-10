// Application types based on database schema

export type AppRole = 'admin' | 'kasir';
export type ProductCategory = 'Print' | 'Stok' | 'Paket' | 'Custom';
export type ProductUnit = 'm2' | 'pcs' | 'lembar' | 'box';
export type TransactionStatus = 'Lunas' | 'Piutang' | 'DP';
export type CustomerType = 'End User' | 'Reseller';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  customer_type: CustomerType;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price_reseller: number;
  price_end_user: number;
  stock: number;
  unit: ProductUnit;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_type: CustomerType;
  total_price: number;
  amount_paid: number;
  status: TransactionStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  custom_name: string | null;
  length: number | null;
  width: number | null;
  real_width: number | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  // Joined data
  product?: Product;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Cart item for POS
export interface CartItem {
  id: string;
  type: 'product' | 'custom';
  product_id?: string;
  product?: Product;
  custom_name?: string;
  length?: number;
  width?: number;
  real_width?: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Width markup logic for print products
export const getMarkupWidth = (width: number): number => {
  if (width <= 1.0) return 1.07;
  if (width <= 1.2) return 1.27;
  if (width <= 1.5) return 1.52;
  return width; // Manual input for > 1.5m
};
