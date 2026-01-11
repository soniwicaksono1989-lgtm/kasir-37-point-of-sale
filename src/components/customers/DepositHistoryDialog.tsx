import { useEffect, useState } from 'react';
import { History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Customer, DepositLog, DepositLogType } from '@/types/database';

interface DepositHistoryDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositHistoryDialog({ customer, open, onOpenChange }: DepositHistoryDialogProps) {
  const [logs, setLogs] = useState<DepositLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDepositLogs();
    }
  }, [open, customer.id]);

  const fetchDepositLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposit_logs')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data || []).map(log => ({
        ...log,
        type: log.type as DepositLogType,
      })));
    } catch (error) {
      console.error('Fetch deposit logs error:', error);
      toast.error('Gagal memuat riwayat deposit');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Riwayat Deposit - {customer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saldo Saat Ini</span>
              <span className="text-xl font-bold text-primary font-mono-numbers">
                {formatCurrency(Number(customer.deposit_balance))}
              </span>
            </div>
          </div>

          <ScrollArea className="h-80">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Memuat...</div>
            ) : logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Belum ada riwayat deposit
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-secondary/30 flex items-start gap-3"
                  >
                    <div className={`mt-1 ${log.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                      {log.type === 'deposit' ? (
                        <ArrowDownCircle className="h-5 w-5" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={log.type === 'deposit' 
                            ? 'bg-success/20 text-success border-success' 
                            : 'bg-destructive/20 text-destructive border-destructive'
                          }
                        >
                          {log.type === 'deposit' ? 'Masuk' : 'Digunakan'}
                        </Badge>
                        <span className={`font-semibold font-mono-numbers ${log.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                          {log.type === 'deposit' ? '+' : '-'}{formatCurrency(Number(log.amount))}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {log.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
