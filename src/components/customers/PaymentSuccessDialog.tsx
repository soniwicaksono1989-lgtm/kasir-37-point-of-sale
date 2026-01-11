import { useState } from 'react';
import { CheckCircle2, Printer, MessageCircle, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Customer } from '@/types/database';
import { AllocationResult } from '@/types/database';
import { 
  generateWhatsAppDebtMessage, 
  openWhatsAppWithMessage,
  generateDebtStatementPDF
} from '@/lib/debtStatementPDF';

interface PaymentSuccessDialogProps {
  customer: Customer;
  allocations: AllocationResult[];
  totalPaid: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentSuccessDialog({ 
  customer, 
  allocations, 
  totalPaid, 
  open, 
  onOpenChange 
}: PaymentSuccessDialogProps) {
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const fullyPaidCount = allocations.filter(a => a.is_fully_paid).length;
  const partialCount = allocations.length - fullyPaidCount;

  const handleSendWhatsApp = async () => {
    if (!customer.phone) {
      toast.error('Customer tidak memiliki nomor telepon');
      return;
    }

    setIsSendingWA(true);
    try {
      // Generate payment receipt message
      let message = `Halo ${customer.name}, terima kasih atas pembayaran Anda!\n\n`;
      message += `*Bukti Pembayaran*\n`;
      message += `Total Dibayar: *${formatCurrency(totalPaid)}*\n\n`;
      message += `Detail Alokasi:\n`;
      
      allocations.forEach((alloc, idx) => {
        message += `${idx + 1}. ${alloc.invoice_number}\n`;
        message += `   Dibayar: ${formatCurrency(alloc.amount_allocated)}`;
        if (alloc.is_fully_paid) {
          message += ` ✅ LUNAS\n`;
        } else {
          message += `\n   Sisa: ${formatCurrency(alloc.remaining_after)}\n`;
        }
      });

      message += `\nTerima kasih. 🙏`;

      openWhatsAppWithMessage(customer.phone, message);
      toast.success('Membuka WhatsApp...');
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error('Gagal membuka WhatsApp');
    } finally {
      setIsSendingWA(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateDebtStatementPDF({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        deposit_balance: customer.deposit_balance,
      });
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Gagal membuat PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-6 w-6" />
            Pembayaran Berhasil!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="text-sm text-muted-foreground mb-1">Total Dibayar</div>
            <div className="text-2xl font-bold text-success font-mono-numbers">
              {formatCurrency(totalPaid)}
            </div>
          </div>

          {/* Allocation Summary */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {fullyPaidCount > 0 && (
                <span className="text-success">✅ {fullyPaidCount} invoice lunas</span>
              )}
              {fullyPaidCount > 0 && partialCount > 0 && <span>, </span>}
              {partialCount > 0 && (
                <span className="text-warning">⏳ {partialCount} invoice tercicil</span>
              )}
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {allocations.map((alloc) => (
                <div 
                  key={alloc.transaction_id}
                  className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30"
                >
                  <span className="font-mono">{alloc.invoice_number}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-numbers">{formatCurrency(alloc.amount_allocated)}</span>
                    {alloc.is_fully_paid ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        sisa {formatCurrency(alloc.remaining_after)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadReceipt}
            disabled={isGeneratingPDF}
            className="w-full sm:w-auto"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Bukti
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={isSendingWA || !customer.phone}
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {isSendingWA ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            Kirim ke WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
