import { forwardRef } from 'react';
import { POSTransaction, POSCartItem } from '@/lib/pdfGenerator';

interface StoreSettings {
  store_name: string;
  address: string | null;
  phone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

interface ThermalReceiptProps {
  transaction: POSTransaction;
  cartItems: POSCartItem[];
  storeSettings: StoreSettings | null;
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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ transaction, cartItems, storeSettings }, ref) => {
    const remaining = transaction.total_price - transaction.amount_paid;
    const change = transaction.amount_paid - transaction.total_price;

    return (
      <div 
        ref={ref} 
        className="thermal-receipt"
        style={{
          width: '80mm',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '5mm',
          backgroundColor: 'white',
          color: 'black',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            {storeSettings?.store_name || 'KASIR 37'}
          </div>
          {storeSettings?.address && (
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              {storeSettings.address}
            </div>
          )}
          {storeSettings?.phone && (
            <div style={{ fontSize: '10px' }}>
              {storeSettings.phone}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ 
          borderTop: '1px dashed black', 
          margin: '8px 0' 
        }} />

        {/* Invoice Info */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div>No: {transaction.invoice_number}</div>
          <div>Tgl: {formatDate(transaction.created_at)}</div>
          <div>Customer: {transaction.customer_name || 'Walk-in'}</div>
        </div>

        {/* Separator */}
        <div style={{ 
          borderTop: '1px dashed black', 
          margin: '8px 0' 
        }} />

        {/* Items */}
        <div style={{ marginBottom: '8px' }}>
          {cartItems.map((item, index) => {
            const productName = item.type === 'custom' 
              ? item.custom_name 
              : item.product?.name || 'Produk';
            
            return (
              <div key={index} style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: '500' }}>{productName}</div>
                {item.file_name && (
                  <div style={{ fontSize: '10px', fontStyle: 'italic', paddingLeft: '8px', color: '#555' }}>
                    File: {item.file_name}
                  </div>
                )}
                {item.length && item.width && (
                  <div style={{ fontSize: '10px', paddingLeft: '8px' }}>
                    {item.length}m × {item.width}m → {item.real_width}m
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  paddingLeft: '8px'
                }}>
                  <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ 
          borderTop: '1px dashed black', 
          margin: '8px 0' 
        }} />

        {/* Totals */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            <span>Total</span>
            <span>{formatCurrency(transaction.total_price)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '11px'
          }}>
            <span>Dibayar</span>
            <span>{formatCurrency(transaction.amount_paid)}</span>
          </div>
          {remaining > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '11px'
            }}>
              <span>Sisa</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
          {change > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '11px'
            }}>
              <span>Kembalian</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div style={{ 
          textAlign: 'center', 
          margin: '10px 0',
          padding: '4px 12px',
          backgroundColor: transaction.status === 'Lunas' ? '#22c55e' : 
                          transaction.status === 'DP' ? '#eab308' : '#ef4444',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
          borderRadius: '4px',
          display: 'inline-block',
          width: 'auto',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {transaction.status}
        </div>

        {/* Bank Info for unpaid */}
        {remaining > 0 && storeSettings?.bank_name && storeSettings?.bank_account_number && (
          <>
            <div style={{ 
              borderTop: '1px dashed black', 
              margin: '8px 0' 
            }} />
            <div style={{ fontSize: '10px' }}>
              <div>Transfer ke:</div>
              <div>{storeSettings.bank_name}: {storeSettings.bank_account_number}</div>
              {storeSettings.bank_account_name && (
                <div>a.n. {storeSettings.bank_account_name}</div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ 
          borderTop: '1px dashed black', 
          margin: '8px 0' 
        }} />
        <div style={{ textAlign: 'center', fontSize: '11px' }}>
          Terima kasih atas kunjungan Anda!
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
