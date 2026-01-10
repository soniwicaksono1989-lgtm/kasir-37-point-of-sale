import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface TransactionWithItems {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_type: string;
  total_price: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    length?: number | null;
    width?: number | null;
  }[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_at: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export async function exportTransactionsToExcel(startDate: string, endDate: string) {
  // Fetch transactions
  const { data: transactions, error: transError } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false });

  if (transError) throw transError;

  // Fetch transaction items with products
  const transactionIds = transactions?.map(t => t.id) || [];
  
  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select(`
      *,
      products:product_id (name)
    `)
    .in('transaction_id', transactionIds);

  if (itemsError) throw itemsError;

  // Build export data
  const exportData: any[] = [];

  transactions?.forEach((trans) => {
    const transItems = items?.filter(i => i.transaction_id === trans.id) || [];
    const productNames = transItems.map(i => {
      let name = i.custom_name || (i.products as any)?.name || 'Produk';
      if (i.length && i.width) {
        name += ` (${i.length}m x ${i.width}m)`;
      }
      return `${name} x${i.quantity}`;
    }).join(', ');

    exportData.push({
      'No. Invoice': trans.invoice_number,
      'Tanggal': formatDate(trans.created_at),
      'Nama Customer': trans.customer_name || 'Walk-in',
      'Tipe Customer': trans.customer_type,
      'Produk': productNames,
      'Total Harga': Number(trans.total_price),
      'Jumlah Dibayar': Number(trans.amount_paid),
      'Sisa': Number(trans.total_price) - Number(trans.amount_paid),
      'Status': trans.status,
      'Catatan': trans.notes || '-',
    });
  });

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Invoice
    { wch: 18 }, // Tanggal
    { wch: 20 }, // Customer
    { wch: 12 }, // Tipe
    { wch: 40 }, // Produk
    { wch: 15 }, // Total
    { wch: 15 }, // Dibayar
    { wch: 15 }, // Sisa
    { wch: 10 }, // Status
    { wch: 20 }, // Catatan
  ];
  ws['!cols'] = colWidths;

  // Download
  const fileName = `Laporan_Transaksi_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportExpensesToExcel(startDate: string, endDate: string) {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (error) throw error;

  const exportData = expenses?.map((exp) => ({
    'Tanggal': formatDate(exp.expense_date),
    'Deskripsi': exp.description,
    'Kategori': exp.category || '-',
    'Jumlah': Number(exp.amount),
  })) || [];

  // Add total row
  const total = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  exportData.push({
    'Tanggal': '',
    'Deskripsi': 'TOTAL PENGELUARAN',
    'Kategori': '',
    'Jumlah': total,
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');

  const colWidths = [
    { wch: 18 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
  ];
  ws['!cols'] = colWidths;

  const fileName = `Laporan_Pengeluaran_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportFullReportToExcel(startDate: string, endDate: string) {
  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false });

  // Fetch transaction items
  const transactionIds = transactions?.map(t => t.id) || [];
  const { data: items } = await supabase
    .from('transaction_items')
    .select(`*, products:product_id (name)`)
    .in('transaction_id', transactionIds);

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transactions
  const transData: any[] = [];
  transactions?.forEach((trans) => {
    const transItems = items?.filter(i => i.transaction_id === trans.id) || [];
    const productNames = transItems.map(i => {
      let name = i.custom_name || (i.products as any)?.name || 'Produk';
      if (i.length && i.width) {
        name += ` (${i.length}m x ${i.width}m)`;
      }
      return `${name} x${i.quantity}`;
    }).join(', ');

    transData.push({
      'No. Invoice': trans.invoice_number,
      'Tanggal': formatDate(trans.created_at),
      'Nama Customer': trans.customer_name || 'Walk-in',
      'Tipe Customer': trans.customer_type,
      'Produk': productNames,
      'Total Harga': Number(trans.total_price),
      'Jumlah Dibayar': Number(trans.amount_paid),
      'Sisa': Number(trans.total_price) - Number(trans.amount_paid),
      'Status': trans.status,
    });
  });

  const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount_paid), 0) || 0;
  transData.push({
    'No. Invoice': '',
    'Tanggal': '',
    'Nama Customer': '',
    'Tipe Customer': '',
    'Produk': 'TOTAL PENDAPATAN',
    'Total Harga': transactions?.reduce((sum, t) => sum + Number(t.total_price), 0) || 0,
    'Jumlah Dibayar': totalRevenue,
    'Sisa': '',
    'Status': '',
  });

  const ws1 = XLSX.utils.json_to_sheet(transData);
  ws1['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, 
    { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

  // Sheet 2: Expenses
  const expData = expenses?.map((exp) => ({
    'Tanggal': formatDate(exp.expense_date),
    'Deskripsi': exp.description,
    'Kategori': exp.category || '-',
    'Jumlah': Number(exp.amount),
  })) || [];

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  expData.push({
    'Tanggal': '',
    'Deskripsi': 'TOTAL PENGELUARAN',
    'Kategori': '',
    'Jumlah': totalExpenses,
  });

  const ws2 = XLSX.utils.json_to_sheet(expData);
  ws2['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Pengeluaran');

  // Sheet 3: Summary
  const summaryData = [
    { 'Keterangan': 'Total Pendapatan', 'Nilai': totalRevenue },
    { 'Keterangan': 'Total Pengeluaran', 'Nilai': totalExpenses },
    { 'Keterangan': 'Laba Bersih', 'Nilai': totalRevenue - totalExpenses },
    { 'Keterangan': 'Total Piutang', 'Nilai': transactions?.filter(t => t.status !== 'Lunas').reduce((sum, t) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0) || 0 },
    { 'Keterangan': 'Jumlah Transaksi', 'Nilai': transactions?.length || 0 },
  ];

  const ws3 = XLSX.utils.json_to_sheet(summaryData);
  ws3['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Ringkasan');

  // Download
  const fileName = `Laporan_Keuangan_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
