import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Phone, MapPin, Wallet, History, CreditCard } from 'lucide-react';
import { customersApi, depositLogsApi, transactionsApi, paymentsApi } from '@/lib/neonApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Customer, CustomerType, DepositLog, Transaction, TransactionStatus } from '@/types/database';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<CustomerType>('End User');

  // Deposit dialog
  const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositNotes, setDepositNotes] = useState('');

  // History dialog
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [depositLogs, setDepositLogs] = useState<DepositLog[]>([]);

  // Payment dialog
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Transaction[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const data = await customersApi.getAll();
      setCustomers(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal memuat customer', { description: errorMessage });
    } finally {
      setIsFetching(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone || '').includes(searchQuery);
    const matchesType = typeFilter === 'all' || c.customer_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openCreateDialog = () => { setEditingCustomer(null); setFormName(''); setFormPhone(''); setFormAddress(''); setFormType('End User'); setIsDialogOpen(true); };
  const openEditDialog = (customer: Customer) => { setEditingCustomer(customer); setFormName(customer.name); setFormPhone(customer.phone || ''); setFormAddress(customer.address || ''); setFormType(customer.customer_type); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Nama customer wajib diisi'); return; }
    setIsLoading(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, { name: formName.trim(), phone: formPhone.trim() || null, address: formAddress.trim() || null, customer_type: formType });
        toast.success('Customer berhasil diperbarui');
      } else {
        await customersApi.create({ name: formName.trim(), phone: formPhone.trim() || null, address: formAddress.trim() || null, customer_type: formType, deposit_balance: 0 });
        toast.success('Customer berhasil ditambahkan');
      }
      setIsDialogOpen(false);
      fetchCustomers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menyimpan customer', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus customer ini?')) return;
    try {
      await customersApi.delete(id);
      toast.success('Customer berhasil dihapus');
      fetchCustomers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menghapus customer', { description: errorMessage });
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Deposit
  const openDeposit = (c: Customer) => { setDepositCustomer(c); setDepositAmount(0); setDepositNotes(''); setIsDepositOpen(true); };
  const handleDeposit = async () => {
    if (!depositCustomer || depositAmount <= 0) { toast.error('Masukkan jumlah deposit yang valid'); return; }
    try {
      await depositLogsApi.create({ customer_id: depositCustomer.id, amount: depositAmount, type: 'deposit', notes: depositNotes || null, created_by: 'local-user-001' });
      await customersApi.update(depositCustomer.id, { deposit_balance: depositCustomer.deposit_balance + depositAmount });
      toast.success('Deposit berhasil ditambahkan');
      setIsDepositOpen(false);
      fetchCustomers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menambah deposit', { description: errorMessage });
    }
  };

  // History
  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setIsHistoryOpen(true);
    try {
      const logs = await depositLogsApi.getByCustomerId(c.id);
      setDepositLogs(logs);
    } catch {
      setDepositLogs([]);
    }
  };

  // Payment
  const openPayment = async (c: Customer) => {
    setPaymentCustomer(c);
    setPaymentAmount(0);
    setIsPaymentOpen(true);
    try {
      const allTx = await transactionsApi.getAll();
      const invoices = allTx.filter((t: Transaction) => t.customer_id === c.id && t.status !== 'Lunas');
      setUnpaidInvoices(invoices);
    } catch {
      setUnpaidInvoices([]);
    }
  };

  const handlePayment = async () => {
    if (!paymentCustomer || paymentAmount <= 0 || unpaidInvoices.length === 0) { toast.error('Masukkan jumlah pembayaran yang valid'); return; }
    try {
      let remaining = paymentAmount;
      for (const inv of unpaidInvoices) {
        if (remaining <= 0) break;
        const owed = Number(inv.total_price) - Number(inv.amount_paid);
        const allocated = Math.min(remaining, owed);
        const newPaid = Number(inv.amount_paid) + allocated;
        const newStatus: TransactionStatus = newPaid >= Number(inv.total_price) ? 'Lunas' : newPaid > 0 ? 'DP' : 'Piutang';
        await transactionsApi.update(inv.id, { amount_paid: newPaid, status: newStatus });
        await paymentsApi.create({ transaction_id: inv.id, amount: allocated, payment_method: 'Cash', notes: 'Mass payment', created_by: 'local-user-001' });
        remaining -= allocated;
      }
      toast.success('Pembayaran berhasil dialokasikan');
      setIsPaymentOpen(false);
      fetchCustomers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal memproses pembayaran', { description: errorMessage });
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-foreground">Customer</h1><p className="text-muted-foreground">Kelola data customer Anda</p></div>
          <Button onClick={openCreateDialog} className="gradient-bg text-primary-foreground glow-effect"><Plus className="mr-2 h-4 w-4" />Tambah Customer</Button>
        </div>

        <Card className="glass-card"><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari nama atau telepon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipe" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Tipe</SelectItem><SelectItem value="End User">End User</SelectItem><SelectItem value="Reseller">Reseller</SelectItem></SelectContent></Select></div></CardContent></Card>

        {isFetching ? (
          <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.length === 0 ? (
              <Card className="glass-card col-span-full"><CardContent className="p-8 text-center"><Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">Tidak ada customer ditemukan</p></CardContent></Card>
            ) : (
              filteredCustomers.map((customer) => (
                <Card key={customer.id} className="glass-card card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><span className="text-primary font-semibold">{customer.name.charAt(0).toUpperCase()}</span></div>
                        <div><h3 className="font-medium text-foreground">{customer.name}</h3><Badge variant="outline" className={customer.customer_type === 'Reseller' ? 'bg-accent/20 text-accent border-accent' : 'bg-info/20 text-info border-info'}>{customer.customer_type}</Badge></div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(customer)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(customer.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {customer.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span>{customer.phone}</span></div>}
                      {customer.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-4 w-4 mt-0.5" /><span className="line-clamp-2">{customer.address}</span></div>}
                    </div>
                    <div className="mt-3 p-2 rounded-lg bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm"><Wallet className="h-4 w-4 text-success" /><span className="text-muted-foreground">Saldo Deposit</span></div>
                        <span className={`font-semibold font-mono-numbers ${customer.deposit_balance > 0 ? 'text-success' : 'text-muted-foreground'}`}>{formatCurrency(customer.deposit_balance)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openDeposit(customer)}><Plus className="h-3 w-3 mr-1" />Deposit</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openHistory(customer)}><History className="h-3 w-3 mr-1" />Riwayat</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openPayment(customer)}><CreditCard className="h-3 w-3 mr-1" />Bayar</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nama Customer</Label><Input placeholder="Nama customer" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Tipe Customer</Label><Select value={formType} onValueChange={(v) => setFormType(v as CustomerType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="End User">End User</SelectItem><SelectItem value="Reseller">Reseller</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>No. Telepon (Opsional)</Label><Input placeholder="08xxxxxxxxxx" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Alamat (Opsional)</Label><Textarea placeholder="Alamat lengkap" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} rows={3} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button><Button onClick={handleSave} disabled={isLoading} className="gradient-bg text-primary-foreground">{isLoading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deposit Dialog */}
        <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
          <DialogContent><DialogHeader><DialogTitle>Tambah Deposit - {depositCustomer?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary/50"><p className="text-sm text-muted-foreground">Saldo Saat Ini</p><p className="text-xl font-bold text-success font-mono-numbers">{formatCurrency(depositCustomer?.deposit_balance || 0)}</p></div>
              <div className="space-y-2"><Label>Jumlah Deposit</Label><Input type="number" placeholder="0" value={depositAmount || ''} onChange={(e) => setDepositAmount(Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Catatan (Opsional)</Label><Textarea placeholder="Catatan deposit" value={depositNotes} onChange={(e) => setDepositNotes(e.target.value)} rows={2} /></div>
              {depositAmount > 0 && <div className="p-3 rounded-lg bg-success/10"><p className="text-sm">Saldo Setelah: <span className="font-bold text-success">{formatCurrency((depositCustomer?.deposit_balance || 0) + depositAmount)}</span></p></div>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDepositOpen(false)}>Batal</Button><Button onClick={handleDeposit} className="gradient-bg text-primary-foreground">Simpan Deposit</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent><DialogHeader><DialogTitle>Riwayat Deposit - {historyCustomer?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-secondary/50"><p className="text-sm text-muted-foreground">Saldo Saat Ini</p><p className="text-xl font-bold text-success font-mono-numbers">{formatCurrency(historyCustomer?.deposit_balance || 0)}</p></div>
              <ScrollArea className="h-64">
                {depositLogs.length === 0 ? <p className="text-center text-muted-foreground py-8">Belum ada riwayat</p> : (
                  <div className="space-y-2">{depositLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-lg bg-secondary/30">
                      <div className="flex justify-between"><Badge className={log.type === 'deposit' ? 'status-lunas' : 'status-piutang'}>{log.type}</Badge><span className={`font-mono-numbers ${log.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>{log.type === 'deposit' ? '+' : '-'}{formatCurrency(log.amount)}</span></div>
                      {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(log.created_at)}</p>
                    </div>
                  ))}</div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Bayar Piutang - {paymentCustomer?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              {unpaidInvoices.length === 0 ? <p className="text-center text-muted-foreground py-8">Tidak ada piutang</p> : (
                <>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">{unpaidInvoices.map(inv => (
                      <div key={inv.id} className="p-3 rounded-lg bg-secondary/30 flex justify-between">
                        <div><p className="font-mono text-sm">{inv.invoice_number}</p><p className="text-xs text-muted-foreground">{formatDate(inv.created_at)}</p></div>
                        <div className="text-right"><p className="font-mono-numbers text-destructive">{formatCurrency(Number(inv.total_price) - Number(inv.amount_paid))}</p><Badge className={inv.status === 'DP' ? 'status-dp' : 'status-piutang'}>{inv.status}</Badge></div>
                      </div>
                    ))}</div>
                  </ScrollArea>
                  <div className="p-3 rounded-lg bg-destructive/10"><p className="text-sm">Total Piutang: <span className="font-bold text-destructive">{formatCurrency(unpaidInvoices.reduce((sum, i) => sum + (Number(i.total_price) - Number(i.amount_paid)), 0))}</span></p></div>
                  <div className="space-y-2"><Label>Jumlah Pembayaran</Label><Input type="number" placeholder="0" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="font-mono-numbers" /></div>
                </>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Batal</Button><Button onClick={handlePayment} disabled={unpaidInvoices.length === 0} className="gradient-bg text-primary-foreground">Proses Pembayaran</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
