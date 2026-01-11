import { useState } from 'react';
import { Wallet, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Customer } from '@/types/database';

interface DepositDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DepositDialog({ customer, open, onOpenChange, onSuccess }: DepositDialogProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDeposit = async () => {
    if (amount <= 0) {
      toast.error('Masukkan jumlah deposit yang valid');
      return;
    }

    setIsProcessing(true);

    try {
      // Create deposit log
      const { error: logError } = await supabase.from('deposit_logs').insert({
        customer_id: customer.id,
        amount: amount,
        type: 'deposit',
        notes: notes.trim() || null,
        created_by: user?.id,
      });

      if (logError) throw logError;

      // Update customer balance
      const newBalance = Number(customer.deposit_balance) + amount;
      const { error: updateError } = await supabase
        .from('customers')
        .update({ deposit_balance: newBalance })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      toast.success('Deposit berhasil ditambahkan', {
        description: `Saldo baru: ${formatCurrency(newBalance)}`,
      });

      setAmount(0);
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Deposit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menambah deposit', { description: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Terima Titip Dana
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-secondary/30">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{customer.name}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">Saldo Saat Ini</span>
              <span className="font-semibold text-primary font-mono-numbers">
                {formatCurrency(Number(customer.deposit_balance))}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Jumlah Deposit</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="font-mono-numbers text-lg"
            />
          </div>

          {amount > 0 && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Saldo Setelah Deposit</span>
                <span className="font-semibold text-success font-mono-numbers">
                  {formatCurrency(Number(customer.deposit_balance) + amount)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Keterangan (Opsional)</Label>
            <Textarea
              placeholder="Catatan deposit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={isProcessing || amount <= 0}
            className="gradient-bg text-primary-foreground"
          >
            {isProcessing ? 'Memproses...' : 'Simpan Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
