import { forwardRef } from 'react';

interface POSCartItem {
  id: string;
  type: 'product' | 'custom';
  product_id?: string;
  product?: { id: string; name: string; category: string; unit: string };
  custom_name?: string;
  file_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  length?: number;
  width?: number;
  real_width?: number;
}

interface POSTransaction {
  invoice_number: string;
  customer_name: string | null;
  customer_type: string;
  total_price: number;
  amount_paid: number;
  discount_amount?: number;
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
    const discountAmount = transaction.discount_amount || 0;
    const subtotal = transaction.total_price + discountAmount; // Reverse calculate subtotal
    const remaining = transaction.total_price - transaction.amount_paid;
    const change = transaction.amount_paid - transaction.total_price;

    return (
      <div 
        ref={ref} 
        className="thermal-receipt"
        style={{
          width: '80mm',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          padding: '2mm 1mm',
          backgroundColor: 'white',
          color: 'black',
          boxSizing: 'border-box',
        }}
      >
        {/* Header with Logo - Centered & Larger */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '10px',
          paddingBottom: '8px'
        }}>
          {/* Logo - Larger and Centered */}
          {storeSettings?.logo_url && (
            <div style={{ 
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img 
                src={storeSettings.logo_url} 
                alt="Logo" 
                style={{ 
                  height: '50px',
                  width: 'auto',
                  maxWidth: '35%',
                  objectFit: 'contain'
                }} 
              />
            </div>
          )}
          
          {/* Store Name - Much Larger & Bold */}
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '22px',
            letterSpacing: '1px',
            marginBottom: '6px',
            lineHeight: '1.2'
          }}>
            {storeSettings?.store_name || 'KASIR 37'}
          </div>
          
          {/* Address - Separate Line with Spacing */}
          {storeSettings?.address && (
            <div style={{ 
              fontSize: '10px', 
              marginTop: '4px',
              lineHeight: '1.4',
              paddingLeft: '4px',
              paddingRight: '4px'
            }}>
              {storeSettings.address}
            </div>
          )}
          
          {/* Phone - Separate Line */}
          {storeSettings?.phone && (
            <div style={{ 
              fontSize: '10px',
              marginTop: '3px'
            }}>
              Telp: {storeSettings.phone}
            </div>
          )}
        </div>

        {/* Separator - Full Width */}
        <hr style={{ 
          border: 'none',
          borderTop: '1px dashed black', 
          margin: '8px 0',
          width: '100%'
        }} />

        {/* Invoice Info */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div>No: {transaction.invoice_number}</div>
          <div>Tgl: {formatDate(transaction.created_at)}</div>
          <div>Customer: {transaction.customer_name || 'Walk-in'}</div>
        </div>

        {/* Separator - Full Width */}
        <hr style={{ 
          border: 'none',
          borderTop: '1px dashed black', 
          margin: '8px 0',
          width: '100%'
        }} />

        {/* Items */}
        <div style={{ marginBottom: '8px' }}>
        {cartItems.map((item, index) => {
            const productName = item.type === 'custom' 
              ? (item.custom_name || 'Produk Custom')
              : (item.product?.name || 'Produk');
            
            // Sanitize file_name - remove garbage characters and validate
            const sanitizedFileName = item.file_name 
              ? item.file_name.replace(/[&%#<>]/g, '').trim()
              : null;
            const hasValidFileName = sanitizedFileName && sanitizedFileName.length > 0 && sanitizedFileName !== 'undefined';
            
            // Validate dimensions - must be valid positive numbers
            const hasValidDimensions = 
              typeof item.length === 'number' && 
              typeof item.width === 'number' && 
              item.length > 0 && 
              item.width > 0 &&
              !isNaN(item.length) && 
              !isNaN(item.width);
            
            return (
              <div key={index} style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: '500' }}>{productName}</div>
                {hasValidFileName && (
                  <div style={{ fontSize: '10px', fontStyle: 'italic', paddingLeft: '8px', color: '#555' }}>
                    File: {sanitizedFileName}
                  </div>
                )}
                {hasValidDimensions && (
                  <div style={{ fontSize: '10px', paddingLeft: '8px' }}>
                    (Ukuran: {item.length}m x {item.width}m{item.real_width && item.real_width > 0 ? ` → ${item.real_width}m` : ''})
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

        {/* Separator - Full Width */}
        <hr style={{ 
          border: 'none',
          borderTop: '1px dashed black', 
          margin: '8px 0',
          width: '100%'
        }} />

        {/* Totals */}
        <div style={{ marginBottom: '8px' }}>
          {/* Show subtotal only if there's a discount */}
          {discountAmount > 0 && (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '11px'
              }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#22c55e'
              }}>
                <span>Diskon</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
            </>
          )}
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
            <hr style={{ 
              border: 'none',
              borderTop: '1px dashed black', 
              margin: '8px 0',
              width: '100%'
            }} />
            <div style={{ fontSize: '10px', textAlign: 'center' }}>
              <div>Transfer ke:</div>
              <div>{storeSettings.bank_name}: {storeSettings.bank_account_number}</div>
              {storeSettings.bank_account_name && (
                <div>a.n. {storeSettings.bank_account_name}</div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <hr style={{ 
          border: 'none',
          borderTop: '1px dashed black', 
          margin: '8px 0',
          width: '100%'
        }} />
        <div style={{ 
          textAlign: 'center', 
          fontSize: '11px',
          paddingTop: '4px',
          paddingBottom: '8px'
        }}>
          Terima kasih atas kunjungan Anda!
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = 'ThermalReceipt';
