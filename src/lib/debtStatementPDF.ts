import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  store_name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

interface DebtInvoice {
  invoice_number: string;
  created_at: string;
  total_price: number;
  amount_paid: number;
  status: string;
  items?: {
    custom_name: string | null;
    file_name: string | null;
    product?: { name: string } | null;
  }[];
}

interface CustomerDebt {
  id: string;
  name: string;
  phone: string | null;
  deposit_balance: number;
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

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

async function getCustomerDebts(customerId: string): Promise<DebtInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        invoice_number,
        created_at,
        total_price,
        amount_paid,
        status,
        transaction_items (
          custom_name,
          file_name,
          product:product_id (name)
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['Piutang', 'DP'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(t => ({
      ...t,
      items: t.transaction_items?.map((item: any) => ({
        custom_name: item.custom_name,
        file_name: item.file_name,
        product: item.product,
      })),
    }));
  } catch (error) {
    console.error('Fetch debts error:', error);
    return [];
  }
}

export async function generateDebtStatementPDF(customer: CustomerDebt): Promise<void> {
  const store = await getStoreSettings();
  const invoices = await getCustomerDebts(customer.id);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;
  const leftMargin = 15;
  let textStartX = pageWidth / 2;
  let textAlign: 'center' | 'left' = 'center';

  // Try to add logo if available
  if (store?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(store.logo_url);
      if (logoBase64) {
        // Add logo on the left (18mm x 18mm)
        doc.addImage(logoBase64, 'PNG', leftMargin, yPos - 5, 18, 18);
        textStartX = leftMargin + 22; // Offset text to the right of logo
        textAlign = 'left';
      }
    } catch {
      // If logo fails to load, continue without it
    }
  }

  // Store Name (Bold, Large)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  if (textAlign === 'left') {
    doc.text(store?.store_name || 'KASIR 37', textStartX, yPos);
  } else {
    doc.text(store?.store_name || 'KASIR 37', textStartX, yPos, { align: 'center' });
  }
  yPos += 6;

  // Address (separate line)
  doc.setFontSize(9);
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
  yPos += 3;
  doc.setLineWidth(0.8);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN TAGIHAN PIUTANG', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Customer Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Kepada Yth:`, leftMargin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name, leftMargin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  if (customer.phone) {
    doc.text(`Telp: ${customer.phone}`, leftMargin, yPos);
    yPos += 5;
  }
  
  doc.text(`Tanggal Cetak: ${formatDate(new Date().toISOString())}`, pageWidth - 15, yPos - 10, { align: 'right' });
  yPos += 8;

  // Invoice Table
  const tableData = invoices.map((inv) => {
    const itemNames = inv.items?.map(item => 
      item.file_name || item.custom_name || item.product?.name || '-'
    ).join(', ') || '-';
    
    const remaining = Number(inv.total_price) - Number(inv.amount_paid);

    return [
      inv.invoice_number,
      formatDateShort(inv.created_at),
      itemNames.length > 30 ? itemNames.substring(0, 30) + '...' : itemNames,
      formatCurrency(Number(inv.total_price)),
      formatCurrency(Number(inv.amount_paid)),
      formatCurrency(remaining),
    ];
  });

  const totalDebt = invoices.reduce((sum, inv) => 
    sum + (Number(inv.total_price) - Number(inv.amount_paid)), 0
  );

  autoTable(doc, {
    startY: yPos,
    head: [['No. Invoice', 'Tanggal', 'Keterangan', 'Total', 'Terbayar', 'Sisa']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(pageWidth - 95, yPos, 80, 30, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Piutang:', pageWidth - 90, yPos + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(220, 53, 69);
  doc.text(formatCurrency(totalDebt), pageWidth - 20, yPos + 8, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo Deposit:', pageWidth - 90, yPos + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 167, 69);
  doc.text(formatCurrency(Number(customer.deposit_balance)), pageWidth - 20, yPos + 18, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Netto Yang Harus Dibayar:', pageWidth - 90, yPos + 28);
  doc.setFont('helvetica', 'bold');
  const netto = totalDebt - Number(customer.deposit_balance);
  doc.setTextColor(netto > 0 ? 220 : 40, netto > 0 ? 53 : 167, netto > 0 ? 69 : 69);
  doc.text(formatCurrency(Math.max(0, netto)), pageWidth - 20, yPos + 28, { align: 'right' });

  yPos += 45;

  // Bank Info
  doc.setTextColor(0, 0, 0);
  if (store?.bank_name && store?.bank_account_number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Pembayaran dapat ditransfer ke:', leftMargin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${store.bank_name}: ${store.bank_account_number}`, leftMargin, yPos);
    yPos += 4;
    if (store.bank_account_name) {
      doc.setFont('helvetica', 'normal');
      doc.text(`a.n. ${store.bank_account_name}`, leftMargin, yPos);
    }
    yPos += 10;
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Dokumen ini dicetak secara otomatis oleh sistem.', pageWidth / 2, yPos + 5, { align: 'center' });

  // Download
  doc.save(`Tagihan_Piutang_${customer.name.replace(/\s+/g, '_')}_${formatDateShort(new Date().toISOString()).replace(/\s+/g, '')}.pdf`);
}

export function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Indonesian numbers
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

export async function generateWhatsAppDebtMessage(customer: CustomerDebt): Promise<string> {
  const store = await getStoreSettings();
  const invoices = await getCustomerDebts(customer.id);

  const totalDebt = invoices.reduce((sum, inv) => 
    sum + (Number(inv.total_price) - Number(inv.amount_paid)), 0
  );

  const today = formatDate(new Date().toISOString());
  const storeName = store?.store_name || 'KASIR 37';
  
  let message = `Halo ${customer.name}, kami dari *${storeName}*.\n\n`;
  message += `Berikut rincian tagihan Anda yang belum lunas per tanggal *${today}*:\n\n`;
  
  // List invoices
  invoices.forEach((inv, idx) => {
    const remaining = Number(inv.total_price) - Number(inv.amount_paid);
    message += `${idx + 1}. ${inv.invoice_number}\n`;
    message += `   Tanggal: ${formatDateShort(inv.created_at)}\n`;
    message += `   Sisa: ${formatCurrency(remaining)}\n\n`;
  });

  message += `*Total Piutang: ${formatCurrency(totalDebt)}*\n`;
  
  if (Number(customer.deposit_balance) > 0) {
    message += `Sisa Saldo Deposit: ${formatCurrency(Number(customer.deposit_balance))}\n`;
    const netto = totalDebt - Number(customer.deposit_balance);
    if (netto > 0) {
      message += `*Netto Yang Harus Dibayar: ${formatCurrency(netto)}*\n`;
    }
  }

  message += `\n`;
  
  if (store?.bank_name && store?.bank_account_number) {
    message += `Mohon segera melakukan pelunasan ke:\n`;
    message += `*${store.bank_name}: ${store.bank_account_number}*\n`;
    if (store.bank_account_name) {
      message += `a.n. ${store.bank_account_name}\n`;
    }
    message += `\n`;
  }

  message += `Terima kasih. 🙏`;

  return message;
}

export function openWhatsAppWithMessage(phone: string, message: string): void {
  const formattedPhone = formatWhatsAppNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  // Use _blank with noopener,noreferrer to avoid blocked response issues
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
