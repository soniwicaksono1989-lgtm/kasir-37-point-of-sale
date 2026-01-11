import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface TransactionItem {
  id: string;
  product_id: string | null;
  custom_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  length: number | null;
  width: number | null;
  real_width: number | null;
  product?: {
    name: string;
    category: string;
    unit: string;
  } | null;
}

interface Transaction {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_type: string;
  total_price: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface StoreSettings {
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function to load image as base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Helper function to add header with logo to PDF
async function addPDFHeader(
  doc: jsPDF,
  store: StoreSettings | null,
  pageWidth: number,
  startY: number,
  showLogo: boolean = true
): Promise<number> {
  let yPos = startY;
  const leftMargin = 12;
  let textStartX = pageWidth / 2;
  let textAlign: 'center' | 'left' = 'center';

  // Try to add logo if available
  if (showLogo && store?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(store.logo_url);
      if (logoBase64) {
        // Add logo on the left (15mm x 15mm)
        doc.addImage(logoBase64, 'PNG', leftMargin, yPos - 5, 15, 15);
        textStartX = leftMargin + 20; // Offset text to the right of logo
        textAlign = 'left';
      }
    } catch {
      // If logo fails to load, continue without it
    }
  }

  // Store Name (Bold, Large)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  if (textAlign === 'left') {
    doc.text(store?.store_name || 'KASIR 37', textStartX, yPos);
  } else {
    doc.text(store?.store_name || 'KASIR 37', textStartX, yPos, { align: 'center' });
  }
  yPos += 5;

  // Address (separate line)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (store?.address) {
    if (textAlign === 'left') {
      doc.text(store.address, textStartX, yPos);
    } else {
      doc.text(store.address, textStartX, yPos, { align: 'center' });
    }
    yPos += 4;
  }

  // Phone (separate line)
  if (store?.phone) {
    if (textAlign === 'left') {
      doc.text(`Telp: ${store.phone}`, textStartX, yPos);
    } else {
      doc.text(`Telp: ${store.phone}`, textStartX, yPos, { align: 'center' });
    }
    yPos += 4;
  }

  // Line separator
  yPos += 2;
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 6;

  return yPos;
}

async function getStoreSettings(): Promise<StoreSettings | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching store settings:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Store settings fetch error:', error);
    return null;
  }
}

async function getTransactionItems(transactionId: string): Promise<TransactionItem[]> {
  try {
    const { data, error } = await supabase
      .from('transaction_items')
      .select(`
        *,
        product:product_id (name, category, unit)
      `)
      .eq('transaction_id', transactionId);
    
    if (error) {
      console.error('Error fetching transaction items:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      ...item,
      product: item.product as TransactionItem['product']
    }));
  } catch (error) {
    console.error('Transaction items fetch error:', error);
    return [];
  }
}

export async function generateReceiptPDF(
  transaction: Transaction,
  format: 'A5' | 'Thermal80mm' = 'A5'
): Promise<void> {
  const store = await getStoreSettings();
  const items = await getTransactionItems(transaction.id);

  if (format === 'Thermal80mm') {
    await generateThermalReceipt(transaction, items, store);
  } else {
    await generateA5Receipt(transaction, items, store);
  }
}

// New function to generate PDF for POS checkout (uses cart items directly)
export interface POSCartItem {
  id: string;
  type: 'product' | 'custom';
  product_id?: string;
  product?: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
  custom_name?: string;
  file_name?: string; // Judul file / keterangan
  quantity: number;
  unit_price: number;
  subtotal: number;
  length?: number;
  width?: number;
  real_width?: number;
}

export interface POSTransaction {
  invoice_number: string;
  customer_name: string | null;
  customer_type: string;
  total_price: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
}

// Function to download A5 PDF directly (avoids popup blocker)
export async function downloadA5ReceiptPDF(
  transaction: POSTransaction,
  cartItems: POSCartItem[]
): Promise<void> {
  const store = await getStoreSettings();
  
  // Convert cart items to transaction items format (with file_name)
  const items = cartItems.map(item => ({
    id: item.id,
    product_id: item.type === 'product' ? item.product_id || null : null,
    custom_name: item.type === 'custom' ? item.custom_name || null : null,
    file_name: item.file_name || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    length: item.length || null,
    width: item.width || null,
    real_width: item.real_width || null,
    product: item.type === 'product' && item.product ? {
      name: item.product.name,
      category: item.product.category,
      unit: item.product.unit,
    } : null,
  }));

  await generateA5ReceiptDownload(transaction, items, store);
}

// Function to get store settings (exported for ThermalReceipt component)
export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  return getStoreSettings();
}

export async function generatePOSReceiptPDF(
  transaction: POSTransaction,
  cartItems: POSCartItem[],
  format: 'A5' | 'Thermal80mm' = 'A5'
): Promise<void> {
  const store = await getStoreSettings();
  
  // Convert cart items to transaction items format
  const items: TransactionItem[] = cartItems.map(item => ({
    id: item.id,
    product_id: item.type === 'product' ? item.product_id || null : null,
    custom_name: item.type === 'custom' ? item.custom_name || null : null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    length: item.length || null,
    width: item.width || null,
    real_width: item.real_width || null,
    product: item.type === 'product' && item.product ? {
      name: item.product.name,
      category: item.product.category,
      unit: item.product.unit,
    } : null,
  }));

  if (format === 'Thermal80mm') {
    await generateThermalReceiptOnline(transaction, items, store);
  } else {
    await generateA5ReceiptOnline(transaction, items, store);
  }
}

// A5 Download version - directly downloads the file
async function generateA5ReceiptDownload(
  transaction: POSTransaction,
  items: TransactionItem[],
  store: StoreSettings | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Use helper function for header with logo
  let yPos = await addPDFHeader(doc, store, pageWidth, 15, true);
  yPos += 2;

  // Invoice Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 12;
  const rightCol = pageWidth - 12;
  
  doc.text(`No. Invoice: ${transaction.invoice_number}`, leftCol, yPos);
  doc.text(`Tanggal: ${formatDate(transaction.created_at)}`, rightCol, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text(`Customer: ${transaction.customer_name || 'Walk-in'}`, leftCol, yPos);
  doc.text(`Tipe: ${transaction.customer_type}`, rightCol, yPos, { align: 'right' });
  yPos += 8;

  // Items Table
  const tableData = items.map((item, index) => {
    let productName = item.custom_name || item.product?.name || 'Produk';
    let descriptionParts: string[] = [];
    
    // Add file_name if exists - sanitize and validate
    const fileName = (item as any).file_name;
    if (fileName && typeof fileName === 'string') {
      const sanitizedFileName = fileName.replace(/[&%#<>]/g, '').trim();
      if (sanitizedFileName.length > 0 && sanitizedFileName !== 'undefined') {
        descriptionParts.push(`File: ${sanitizedFileName}`);
      }
    }
    
    // Validate dimensions - must be valid positive numbers
    const hasValidDimensions = 
      typeof item.length === 'number' && 
      typeof item.width === 'number' && 
      item.length > 0 && 
      item.width > 0 &&
      !isNaN(item.length) && 
      !isNaN(item.width);
    
    if (hasValidDimensions) {
      const realWidthText = item.real_width && item.real_width > 0 ? ` → ${item.real_width}m` : '';
      descriptionParts.push(`(Ukuran: ${item.length}m x ${item.width}m${realWidthText})`);
    }

    const description = descriptionParts.join('\n');

    return [
      (index + 1).toString(),
      productName + (description ? `\n${description}` : ''),
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.subtotal),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['No', 'Produk', 'Qty', 'Harga', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 10, right: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - 12;
  
  doc.setFontSize(9);
  doc.text('Total:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.total_price), totalsX, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text('Dibayar:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.amount_paid), totalsX, yPos, { align: 'right' });
  yPos += 5;

  const remaining = transaction.total_price - transaction.amount_paid;
  if (remaining > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Sisa:', totalsX - 50, yPos);
    doc.text(formatCurrency(remaining), totalsX, yPos, { align: 'right' });
    yPos += 5;
  } else if (remaining < 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Kembalian:', totalsX - 50, yPos);
    doc.text(formatCurrency(Math.abs(remaining)), totalsX, yPos, { align: 'right' });
    yPos += 5;
  }

  // Status Badge
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  const statusColor = transaction.status === 'Lunas' ? [46, 204, 113] : 
                      transaction.status === 'DP' ? [241, 196, 15] : [231, 76, 60];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth / 2 - 15, yPos - 4, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(transaction.status, pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // Bank Info (if not fully paid)
  if (remaining > 0 && store?.bank_name && store?.bank_account_number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Pembayaran dapat ditransfer ke:', leftCol, yPos);
    yPos += 4;
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, leftCol, yPos);
    yPos += 4;
    if (store.bank_account_name) {
      doc.text(`a.n. ${store.bank_account_name}`, leftCol, yPos);
    }
    yPos += 8;
  }

  // Notes
  if (transaction.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Catatan: ${transaction.notes}`, leftCol, yPos);
    yPos += 8;
  }

  // Footer
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, yPos, { align: 'center' });

  // Download directly (no popup blocker issue)
  doc.save(`Nota_A5_${transaction.invoice_number}.pdf`);
}

async function generateA5Receipt(
  transaction: Transaction,
  items: TransactionItem[],
  store: StoreSettings | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Use helper function for header with logo
  let yPos = await addPDFHeader(doc, store, pageWidth, 15, true);
  yPos += 2;

  // Invoice Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Two column info
  const leftCol = 12;
  const rightCol = pageWidth - 12;
  
  doc.text(`No. Invoice: ${transaction.invoice_number}`, leftCol, yPos);
  doc.text(`Tanggal: ${formatDate(transaction.created_at)}`, rightCol, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text(`Customer: ${transaction.customer_name || 'Walk-in'}`, leftCol, yPos);
  doc.text(`Tipe: ${transaction.customer_type}`, rightCol, yPos, { align: 'right' });
  yPos += 8;

  // Items Table
  const tableData = items.map((item, index) => {
    let productName = item.custom_name || item.product?.name || 'Produk';
    
    // Validate dimensions - must be valid positive numbers
    const hasValidDimensions = 
      typeof item.length === 'number' && 
      typeof item.width === 'number' && 
      item.length > 0 && 
      item.width > 0 &&
      !isNaN(item.length) && 
      !isNaN(item.width);
    
    let description = '';
    if (hasValidDimensions) {
      const realWidthText = item.real_width && item.real_width > 0 ? ` → ${item.real_width}m` : '';
      description = `(Ukuran: ${item.length}m x ${item.width}m${realWidthText})`;
    }

    return [
      (index + 1).toString(),
      productName + (description ? `\n${description}` : ''),
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.subtotal),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['No', 'Produk', 'Qty', 'Harga', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 10, right: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - 12;
  
  doc.setFontSize(9);
  doc.text('Total:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.total_price), totalsX, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text('Dibayar:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.amount_paid), totalsX, yPos, { align: 'right' });
  yPos += 5;

  const remaining = transaction.total_price - transaction.amount_paid;
  if (remaining > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Sisa:', totalsX - 50, yPos);
    doc.text(formatCurrency(remaining), totalsX, yPos, { align: 'right' });
    yPos += 5;
  }

  // Status Badge
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  const statusColor = transaction.status === 'Lunas' ? [46, 204, 113] : 
                      transaction.status === 'DP' ? [241, 196, 15] : [231, 76, 60];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth / 2 - 15, yPos - 4, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(transaction.status, pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // Bank Info (if not fully paid)
  if (remaining > 0 && store?.bank_name && store?.bank_account_number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Pembayaran dapat ditransfer ke:', leftCol, yPos);
    yPos += 4;
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, leftCol, yPos);
    yPos += 4;
    if (store.bank_account_name) {
      doc.text(`a.n. ${store.bank_account_name}`, leftCol, yPos);
    }
    yPos += 8;
  }

  // Notes
  if (transaction.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Catatan: ${transaction.notes}`, leftCol, yPos);
    yPos += 8;
  }

  // Footer
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, yPos, { align: 'center' });

  // Save/Download
  doc.save(`Invoice_${transaction.invoice_number}.pdf`);
}

// Online version - opens in new tab for browser print
async function generateA5ReceiptOnline(
  transaction: POSTransaction,
  items: TransactionItem[],
  store: StoreSettings | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Use helper function for header with logo
  let yPos = await addPDFHeader(doc, store, pageWidth, 15, true);
  yPos += 2;

  // Invoice Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 12;
  const rightCol = pageWidth - 12;
  
  doc.text(`No. Invoice: ${transaction.invoice_number}`, leftCol, yPos);
  doc.text(`Tanggal: ${formatDate(transaction.created_at)}`, rightCol, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text(`Customer: ${transaction.customer_name || 'Walk-in'}`, leftCol, yPos);
  doc.text(`Tipe: ${transaction.customer_type}`, rightCol, yPos, { align: 'right' });
  yPos += 8;

  // Items Table
  const tableData = items.map((item, index) => {
    let productName = item.custom_name || item.product?.name || 'Produk';
    let description = '';
    
    if (item.length != null && item.width != null && item.length > 0 && item.width > 0) {
      description = `(Ukuran: ${item.length}m x ${item.width}m${item.real_width ? ` → ${item.real_width}m` : ''})`;
    }

    return [
      (index + 1).toString(),
      productName + (description ? `\n${description}` : ''),
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.subtotal),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['No', 'Produk', 'Qty', 'Harga', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 10, right: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - 12;
  
  doc.setFontSize(9);
  doc.text('Total:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.total_price), totalsX, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text('Dibayar:', totalsX - 50, yPos);
  doc.text(formatCurrency(transaction.amount_paid), totalsX, yPos, { align: 'right' });
  yPos += 5;

  const remaining = transaction.total_price - transaction.amount_paid;
  if (remaining > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Sisa:', totalsX - 50, yPos);
    doc.text(formatCurrency(remaining), totalsX, yPos, { align: 'right' });
    yPos += 5;
  } else if (remaining < 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Kembalian:', totalsX - 50, yPos);
    doc.text(formatCurrency(Math.abs(remaining)), totalsX, yPos, { align: 'right' });
    yPos += 5;
  }

  // Status Badge
  yPos += 3;
  doc.setFont('helvetica', 'bold');
  const statusColor = transaction.status === 'Lunas' ? [46, 204, 113] : 
                      transaction.status === 'DP' ? [241, 196, 15] : [231, 76, 60];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth / 2 - 15, yPos - 4, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(transaction.status, pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // Bank Info (if not fully paid)
  if (remaining > 0 && store?.bank_name && store?.bank_account_number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Pembayaran dapat ditransfer ke:', leftCol, yPos);
    yPos += 4;
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, leftCol, yPos);
    yPos += 4;
    if (store.bank_account_name) {
      doc.text(`a.n. ${store.bank_account_name}`, leftCol, yPos);
    }
    yPos += 8;
  }

  // Notes
  if (transaction.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Catatan: ${transaction.notes}`, leftCol, yPos);
    yPos += 8;
  }

  // Footer
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, yPos, { align: 'center' });

  // Open in new tab for online printing
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl.toString(), '_blank');
}

async function generateThermalReceipt(
  transaction: Transaction,
  items: TransactionItem[],
  store: StoreSettings | null
): Promise<void> {
  // Thermal 80mm = ~72mm printable width
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // width x estimated height
  });

  const pageWidth = 80;
  let yPos = 5;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(store?.store_name || 'KASIR 37', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (store?.address) {
    const addressLines = doc.splitTextToSize(store.address, 70);
    addressLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
    });
  }
  if (store?.phone) {
    doc.text(store.phone, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
  }

  // Dashed line
  yPos += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Invoice details
  doc.setFontSize(8);
  doc.text(`No: ${transaction.invoice_number}`, 3, yPos);
  yPos += 4;
  doc.text(`Tgl: ${formatDate(transaction.created_at)}`, 3, yPos);
  yPos += 4;
  doc.text(`Customer: ${transaction.customer_name || 'Walk-in'}`, 3, yPos);
  yPos += 4;

  // Dashed line
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Items
  doc.setFontSize(7);
  items.forEach((item) => {
    let productName = item.custom_name || item.product?.name || 'Produk';
    
    // Product name (truncate if too long)
    if (productName.length > 30) {
      productName = productName.substring(0, 27) + '...';
    }
    doc.text(productName, 3, yPos);
    yPos += 3;

    // Dimensions if print product
    if (item.length && item.width) {
      doc.setFontSize(6);
      doc.text(`  ${item.length}m × ${item.width}m → ${item.real_width}m`, 3, yPos);
      yPos += 3;
      doc.setFontSize(7);
    }

    // Qty x Price = Subtotal
    const qtyPrice = `${item.quantity} x ${formatCurrency(item.unit_price)}`;
    const subtotal = formatCurrency(item.subtotal);
    doc.text(qtyPrice, 5, yPos);
    doc.text(subtotal, pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  });

  // Dashed line
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Totals
  doc.setFontSize(8);
  doc.text('Total', 3, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(transaction.total_price), pageWidth - 3, yPos, { align: 'right' });
  yPos += 4;

  doc.setFont('helvetica', 'normal');
  doc.text('Dibayar', 3, yPos);
  doc.text(formatCurrency(transaction.amount_paid), pageWidth - 3, yPos, { align: 'right' });
  yPos += 4;

  const remaining = transaction.total_price - transaction.amount_paid;
  if (remaining > 0) {
    doc.text('Sisa', 3, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(remaining), pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  } else if (remaining < 0) {
    doc.text('Kembalian', 3, yPos);
    doc.text(formatCurrency(Math.abs(remaining)), pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  }

  // Status
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${transaction.status}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Bank info for unpaid
  if (remaining > 0 && store?.bank_name && store?.bank_account_number) {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(3, yPos, pageWidth - 3, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Transfer ke:', 3, yPos);
    yPos += 3;
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, 3, yPos);
    yPos += 3;
    if (store.bank_account_name) {
      doc.text(`a.n. ${store.bank_account_name}`, 3, yPos);
      yPos += 3;
    }
  }

  // Footer
  yPos += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Terima kasih!', pageWidth / 2, yPos, { align: 'center' });

  // Save
  doc.save(`Struk_${transaction.invoice_number}.pdf`);
}

// Online Thermal version - opens in new tab for browser print
async function generateThermalReceiptOnline(
  transaction: POSTransaction,
  items: TransactionItem[],
  store: StoreSettings | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  });

  const pageWidth = 80;
  let yPos = 5;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(store?.store_name || 'KASIR 37', pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (store?.address) {
    const addressLines = doc.splitTextToSize(store.address, 70);
    addressLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
    });
  }
  if (store?.phone) {
    doc.text(store.phone, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
  }

  // Dashed line
  yPos += 2;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Invoice details
  doc.setFontSize(8);
  doc.text(`No: ${transaction.invoice_number}`, 3, yPos);
  yPos += 4;
  doc.text(`Tgl: ${formatDate(transaction.created_at)}`, 3, yPos);
  yPos += 4;
  doc.text(`Customer: ${transaction.customer_name || 'Walk-in'}`, 3, yPos);
  yPos += 4;

  // Dashed line
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Items
  doc.setFontSize(7);
  items.forEach((item) => {
    let productName = item.custom_name || item.product?.name || 'Produk';
    
    if (productName.length > 30) {
      productName = productName.substring(0, 27) + '...';
    }
    doc.text(productName, 3, yPos);
    yPos += 3;

    if (item.length && item.width) {
      doc.setFontSize(6);
      doc.text(`  ${item.length}m × ${item.width}m → ${item.real_width}m`, 3, yPos);
      yPos += 3;
      doc.setFontSize(7);
    }

    const qtyPrice = `${item.quantity} x ${formatCurrency(item.unit_price)}`;
    const subtotal = formatCurrency(item.subtotal);
    doc.text(qtyPrice, 5, yPos);
    doc.text(subtotal, pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  });

  // Dashed line
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;

  // Totals
  doc.setFontSize(8);
  doc.text('Total', 3, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(transaction.total_price), pageWidth - 3, yPos, { align: 'right' });
  yPos += 4;

  doc.setFont('helvetica', 'normal');
  doc.text('Dibayar', 3, yPos);
  doc.text(formatCurrency(transaction.amount_paid), pageWidth - 3, yPos, { align: 'right' });
  yPos += 4;

  const remaining = transaction.total_price - transaction.amount_paid;
  if (remaining > 0) {
    doc.text('Sisa', 3, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(remaining), pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  } else if (remaining < 0) {
    doc.text('Kembalian', 3, yPos);
    doc.text(formatCurrency(Math.abs(remaining)), pageWidth - 3, yPos, { align: 'right' });
    yPos += 4;
  }

  // Status
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${transaction.status}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Bank info for unpaid
  if (remaining > 0 && store?.bank_name && store?.bank_account_number) {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(3, yPos, pageWidth - 3, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Transfer ke:', 3, yPos);
    yPos += 3;
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, 3, yPos);
    yPos += 3;
    if (store.bank_account_name) {
      doc.text(`a.n. ${store.bank_account_name}`, 3, yPos);
      yPos += 3;
    }
  }

  // Footer
  yPos += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(3, yPos, pageWidth - 3, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Terima kasih!', pageWidth / 2, yPos, { align: 'center' });

  // Open in new tab for online printing
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl.toString(), '_blank');
}
