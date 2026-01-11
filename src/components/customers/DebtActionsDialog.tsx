import { useState, useEffect } from 'react';
import { FileText, MessageCircle, Download, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Customer, Transaction } from '@/types/database';
import { 
  generateDebtStatementPDF, 
  generateWhatsAppDebtMessage, 
  openWhatsAppWithMessage 
} from '@/lib/debtStatementPDF';

interface DebtActionsDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtActionsDialog({ customer, open, onOpenChange }: DebtActionsDialogProps) {
  const [invoices, setInvoices] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUnpaidInvoices();
    }
  }, [open, customer.id]);

  const fetchUnpaidInvoices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .in('status', ['Piutang', 'DP'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInvoices((data || []).map(t => ({
        ...t,
        customer_type: t.customer_type as Transaction['customer_type'],
        status: t.status as Transaction['status'],
      })));
    } catch (error) {
      console.error('Fetch invoices error:', error);
      toast.error('Gagal memuat daftar piutang');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRemainingAmount = (invoice: Transaction) => {
    return Number(invoice.total_price) - Number(invoice.amount_paid);
  };

  const totalDebt = invoices.reduce((sum, inv) => sum + getRemainingAmount(inv), 0);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateDebtStatementPDF({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        deposit_balance: customer.deposit_balance,
      });
      toast.success('PDF Laporan Tagihan berhasil diunduh');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Gagal membuat PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!customer.phone) {
      toast.error('Customer tidak memiliki nomor telepon');
      return;
    }

    setIsSendingWA(true);
    try {
      const message = await generateWhatsAppDebtMessage({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        deposit_balance: customer.deposit_balance,
      });
      openWhatsAppWithMessage(customer.phone, message);
      toast.success('Membuka WhatsApp...');
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error('Gagal membuka WhatsApp');
    } finally {
      setIsSendingWA(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Laporan Piutang - {customer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-sm text-muted-foreground">Total Piutang</div>
              <div className="font-bold text-lg text-destructive font-mono-numbers">
                {formatCurrency(totalDebt)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="text-sm text-muted-foreground">Saldo Deposit</div>
              <div className="font-bold text-lg text-success font-mono-numbers">
                {formatCurrency(Number(customer.deposit_balance))}
              </div>
            </div>
          </div>

          {/* Phone Warning */}
          {!customer.phone && (
            <Alert className="border-warning bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription>
                Customer belum memiliki nomor telepon. Fitur WhatsApp tidak tersedia.
              </AlertDescription>
            </Alert>
          )}

          {/* Invoice List */}
          <div>
            <div className="text-sm font-medium mb-2">
              Daftar Invoice ({invoices.length})
            </div>
            <ScrollArea className="h-48 rounded-lg border">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Tidak ada piutang
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-3 rounded-lg bg-secondary/30 border"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{invoice.invoice_number}</span>
                        <Badge className={invoice.status === 'DP' ? 'status-dp' : 'status-piutang'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-sm">
                        <span className="text-muted-foreground">{formatDate(invoice.created_at)}</span>
                        <span className="font-semibold text-destructive font-mono-numbers">
                          Sisa: {formatCurrency(getRemainingAmount(invoice))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || invoices.length === 0}
            className="w-full sm:w-auto"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={isSendingWA || invoices.length === 0 || !customer.phone}
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {isSendingWA ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            Kirim via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
