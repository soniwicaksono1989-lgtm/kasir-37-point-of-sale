import { useEffect, useState } from 'react';
import { Receipt, Search, CreditCard, Eye, Printer, FileText, Trash2 } from 'lucide-react';
import { 
  transactionsStorage, 
  transactionItemsStorage,
  paymentsStorage,
  productsStorage,
} from '@/lib/localStorage';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Transaction, TransactionItem, TransactionStatus, Product } from '@/types/database';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<(TransactionItem & { product?: Product })[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = () => {
    const data = transactionsStorage.getAll();
    setTransactions(data);
  };

  const fetchTransactionItems = (transactionId: string) => {
    const items = transactionItemsStorage.getByTransactionId(transactionId);
    // Attach product data
    const itemsWithProducts = items.map(item => {
      if (item.product_id) {
        const product = productsStorage.getById(item.product_id);
        return { ...item, product };
      }
      return item;
    });
    setTransactionItems(itemsWithProducts);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (transaction.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    fetchTransactionItems(transaction.id);
    setIsDetailOpen(true);
  };

  const openPayment = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setPaymentAmount(0);
    setIsPaymentOpen(true);
  };

  const handlePayment = () => {
    if (!selectedTransaction || paymentAmount <= 0) {
      toast.error('Masukkan jumlah pembayaran yang valid');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment record
      paymentsStorage.create({
        transaction_id: selectedTransaction.id,
        amount: paymentAmount,
        payment_method: 'Cash',
        notes: null,
        created_by: 'local-user-001',
      });

      // Calculate new amount paid
      const newAmountPaid = Number(selectedTransaction.amount_paid) + paymentAmount;
      const totalPrice = Number(selectedTransaction.total_price);
      
      // Determine new status
      let newStatus: TransactionStatus = 'Piutang';
      if (newAmountPaid >= totalPrice) {
        newStatus = 'Lunas';
      } else if (newAmountPaid > 0) {
        newStatus = 'DP';
      }

      // Update transaction
      transactionsStorage.update(selectedTransaction.id, {
        amount_paid: newAmountPaid,
        status: newStatus,
      });

      toast.success('Pembayaran berhasil dicatat');
      fetchTransactions();
      setIsPaymentOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal mencatat pembayaran', { description: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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

  const getRemainingAmount = (transaction: Transaction) => {
    return Number(transaction.total_price) - Number(transaction.amount_paid);
  };

  const openDeleteConfirm = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteOpen(true);
  };

  const handleDeleteTransaction = () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);

    try {
      // Restore stock for transaction items
      const items = transactionItemsStorage.getByTransactionId(transactionToDelete.id);
      items.forEach(item => {
        if (item.product_id) {
          const product = productsStorage.getById(item.product_id);
          if (product && (product.category === 'Stok' || ['pcs', 'lembar', 'box'].includes(product.unit))) {
            productsStorage.update(item.product_id, {
              stock: product.stock + item.quantity
            });
          }
        }
      });

      // Delete transaction (also deletes items and payments)
      transactionsStorage.delete(transactionToDelete.id);

      toast.success(`Transaksi ${transactionToDelete.invoice_number} berhasil dihapus`);
      fetchTransactions();
      setIsDeleteOpen(false);
      setTransactionToDelete(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menghapus transaksi', { description: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Riwayat Transaksi</h1>
          <p className="text-muted-foreground">Kelola dan pantau semua transaksi</p>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari invoice atau customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="DP">DP</SelectItem>
                  <SelectItem value="Piutang">Piutang</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Daftar Transaksi ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Tidak ada transaksi ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium font-mono">
                          {transaction.invoice_number}
                        </TableCell>
                        <TableCell>
                          {transaction.customer_name || 'Walk-in'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.customer_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers">
                          {formatCurrency(transaction.total_price)}
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers">
                          {formatCurrency(transaction.amount_paid)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.status === 'Lunas'
                                ? 'status-lunas'
                                : transaction.status === 'DP'
                                ? 'status-dp'
                                : 'status-piutang'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDetail(transaction)}
                              title="Lihat Detail"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {transaction.status !== 'Lunas' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-success hover:text-success"
                                onClick={() => openPayment(transaction)}
                                title="Bayar"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteConfirm(transaction)}
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detail Transaksi</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice</p>
                    <p className="font-medium font-mono">{selectedTransaction.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal</p>
                    <p className="font-medium">{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedTransaction.customer_name || 'Walk-in'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      className={
                        selectedTransaction.status === 'Lunas'
                          ? 'status-lunas'
                          : selectedTransaction.status === 'DP'
                          ? 'status-dp'
                          : 'status-piutang'
                      }
                    >
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Item Transaksi</p>
                  <ScrollArea className="h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Ukuran</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.custom_name || item.product?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {item.length && item.width
                                ? `${item.length}m × ${item.width}m`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono-numbers">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-primary font-mono-numbers">
                    {formatCurrency(selectedTransaction.total_price)}
                  </span>
                </div>

                {/* Print Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      toast.info('Fitur cetak tidak tersedia dalam mode offline');
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cetak A5
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      toast.info('Fitur cetak tidak tersedia dalam mode offline');
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak Thermal
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pelunasan Piutang</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="font-mono">{selectedTransaction.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(selectedTransaction.total_price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sudah Dibayar</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(selectedTransaction.amount_paid)}
                    </span>
                  </div>
                  <div className="flex justify-between text-destructive font-semibold">
                    <span>Sisa</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(getRemainingAmount(selectedTransaction))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Jumlah Pembayaran</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="font-mono-numbers text-lg"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="gradient-bg text-primary-foreground"
              >
                {isProcessing ? 'Memproses...' : 'Simpan Pembayaran'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Hapus Transaksi
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Apakah Anda yakin ingin menghapus transaksi{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {transactionToDelete?.invoice_number}
                  </span>
                  ?
                </p>
                <p className="text-sm text-muted-foreground">
                  Tindakan ini akan:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Mengembalikan stok produk yang terjual</li>
                  <li>Menghapus riwayat pembayaran secara permanen</li>
                </ul>
                <p className="text-sm font-medium text-destructive mt-2">
                  Tindakan ini tidak dapat dibatalkan!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTransaction}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
