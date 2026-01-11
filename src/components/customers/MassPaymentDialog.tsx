import { useEffect, useState } from 'react';
import { CreditCard, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Customer, Transaction, TransactionStatus, AllocationResult } from '@/types/database';

interface MassPaymentDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MassPaymentDialog({ customer, open, onOpenChange, onSuccess }: MassPaymentDialogProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Transaction[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [useDeposit, setUseDeposit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<AllocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const depositBalance = Number(customer.deposit_balance);

  useEffect(() => {
    if (open) {
      fetchUnpaidInvoices();
      setSelectedInvoices(new Set());
      setPaymentAmount(0);
      setUseDeposit(false);
      setAllocationPreview([]);
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
        .order('created_at', { ascending: true }); // FIFO - oldest first

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

  const totalUnpaid = invoices.reduce((sum, inv) => sum + getRemainingAmount(inv), 0);
  const selectedTotal = Array.from(selectedInvoices).reduce((sum, id) => {
    const invoice = invoices.find(i => i.id === id);
    return sum + (invoice ? getRemainingAmount(invoice) : 0);
  }, 0);

  const totalPayment = (useDeposit ? depositBalance : 0) + paymentAmount;

  // Calculate FIFO allocation preview
  useEffect(() => {
    if (totalPayment <= 0) {
      setAllocationPreview([]);
      return;
    }

    let remainingPayment = totalPayment;
    const allocations: AllocationResult[] = [];

    // Filter by selected invoices if any, otherwise use all (FIFO)
    const targetInvoices = selectedInvoices.size > 0
      ? invoices.filter(inv => selectedInvoices.has(inv.id))
      : invoices;

    for (const invoice of targetInvoices) {
      if (remainingPayment <= 0) break;

      const invoiceRemaining = getRemainingAmount(invoice);
      const allocatedAmount = Math.min(remainingPayment, invoiceRemaining);
      
      allocations.push({
        transaction_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount_allocated: allocatedAmount,
        remaining_before: invoiceRemaining,
        remaining_after: invoiceRemaining - allocatedAmount,
        is_fully_paid: invoiceRemaining - allocatedAmount <= 0,
      });

      remainingPayment -= allocatedAmount;
    }

    setAllocationPreview(allocations);
  }, [totalPayment, selectedInvoices, invoices]);

  const toggleInvoiceSelection = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const selectAllInvoices = () => {
    setSelectedInvoices(new Set(invoices.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  const handlePayment = async () => {
    if (totalPayment <= 0) {
      toast.error('Masukkan jumlah pembayaran');
      return;
    }

    if (allocationPreview.length === 0) {
      toast.error('Tidak ada invoice untuk dialokasikan');
      return;
    }

    setIsProcessing(true);

    try {
      // Process each allocation
      for (const allocation of allocationPreview) {
        // Create payment record
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({
            transaction_id: allocation.transaction_id,
            amount: allocation.amount_allocated,
            payment_method: useDeposit ? 'Deposit' : 'Cash',
            notes: useDeposit ? 'Pembayaran dari saldo deposit' : 'Pembayaran cicilan',
            created_by: user?.id,
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Create payment allocation record
        const { error: allocError } = await supabase
          .from('payment_allocations')
          .insert({
            payment_id: paymentData.id,
            transaction_id: allocation.transaction_id,
            amount: allocation.amount_allocated,
          });

        if (allocError) throw allocError;

        // Update transaction
        const invoice = invoices.find(i => i.id === allocation.transaction_id)!;
        const newAmountPaid = Number(invoice.amount_paid) + allocation.amount_allocated;
        const newStatus: TransactionStatus = allocation.is_fully_paid ? 'Lunas' : 'DP';

        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
          })
          .eq('id', allocation.transaction_id);

        if (updateError) throw updateError;
      }

      // If using deposit, update customer balance and create log
      if (useDeposit && depositBalance > 0) {
        const depositUsed = Math.min(depositBalance, totalPayment);
        const newBalance = depositBalance - depositUsed;

        // Create deposit usage log
        const { error: logError } = await supabase.from('deposit_logs').insert({
          customer_id: customer.id,
          amount: depositUsed,
          type: 'usage',
          notes: `Digunakan untuk pembayaran ${allocationPreview.length} invoice`,
          created_by: user?.id,
        });

        if (logError) throw logError;

        // Update customer balance
        const { error: balanceError } = await supabase
          .from('customers')
          .update({ deposit_balance: newBalance })
          .eq('id', customer.id);

        if (balanceError) throw balanceError;
      }

      const fullyPaidCount = allocationPreview.filter(a => a.is_fully_paid).length;
      toast.success('Pembayaran berhasil dialokasikan!', {
        description: `${fullyPaidCount} invoice lunas, ${allocationPreview.length - fullyPaidCount} invoice tercicil`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal memproses pembayaran', { description: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pembayaran Multi-Invoice - {customer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Deposit Info */}
          {depositBalance > 0 && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-success" />
                  <span>Saldo Deposit</span>
                </div>
                <span className="font-semibold text-success font-mono-numbers">
                  {formatCurrency(depositBalance)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="use-deposit"
                  checked={useDeposit}
                  onCheckedChange={(checked) => setUseDeposit(checked === true)}
                />
                <label htmlFor="use-deposit" className="text-sm cursor-pointer">
                  Gunakan saldo deposit untuk pembayaran
                </label>
              </div>
            </div>
          )}

          {/* Invoice List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Daftar Piutang ({invoices.length})</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllInvoices}>
                  Pilih Semua
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Hapus Pilihan
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-48 rounded-lg border">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">Memuat...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Tidak ada piutang untuk customer ini
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedInvoices.has(invoice.id)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-secondary/30 hover:bg-secondary/50'
                      }`}
                      onClick={() => toggleInvoiceSelection(invoice.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        />
                        <div className="flex-1 min-w-0">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <p className="text-sm text-muted-foreground mt-2">
              {selectedInvoices.size > 0 
                ? `${selectedInvoices.size} invoice dipilih (${formatCurrency(selectedTotal)})`
                : 'Kosongkan pilihan untuk alokasi FIFO otomatis'
              }
            </p>
          </div>

          {/* Payment Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bayar Cash (Tambahan)</Label>
              <Input
                type="number"
                placeholder="0"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="font-mono-numbers"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Pembayaran</Label>
              <div className="h-10 px-3 py-2 rounded-md bg-primary/10 flex items-center justify-end">
                <span className="font-bold text-primary font-mono-numbers">
                  {formatCurrency(totalPayment)}
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Preview */}
          {allocationPreview.length > 0 && (
            <Alert className="border-info bg-info/10">
              <AlertCircle className="h-4 w-4 text-info" />
              <AlertDescription>
                <p className="font-medium mb-2">Preview Alokasi:</p>
                <ul className="text-sm space-y-1">
                  {allocationPreview.map((alloc) => (
                    <li key={alloc.transaction_id} className="flex items-center justify-between">
                      <span className="font-mono">{alloc.invoice_number}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono-numbers">{formatCurrency(alloc.amount_allocated)}</span>
                        {alloc.is_fully_paid ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            sisa {formatCurrency(alloc.remaining_after)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing || totalPayment <= 0 || allocationPreview.length === 0}
            className="gradient-bg text-primary-foreground"
          >
            {isProcessing ? 'Memproses...' : 'Proses Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
