import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Phone, MapPin, Wallet, History, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Customer, CustomerType } from '@/types/database';
import { DepositDialog } from '@/components/customers/DepositDialog';
import { DepositHistoryDialog } from '@/components/customers/DepositHistoryDialog';
import { MassPaymentDialog } from '@/components/customers/MassPaymentDialog';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<CustomerType>('End User');

  // Deposit & Payment dialogs
  const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Gagal memuat customer');
      return;
    }

    setCustomers((data || []).map(c => ({
      ...c,
      customer_type: c.customer_type as CustomerType,
      deposit_balance: Number(c.deposit_balance) || 0,
    })));
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || '').includes(searchQuery);
    const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormType('End User');
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormAddress(customer.address || '');
    setFormType(customer.customer_type);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nama customer wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      const customerData = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
        customer_type: formType,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Customer berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;
        toast.success('Customer berhasil ditambahkan');
      }

      fetchCustomers();
      setIsDialogOpen(false);
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
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer berhasil dihapus');
      fetchCustomers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menghapus customer', { description: errorMessage });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const openDeposit = (customer: Customer) => {
    setDepositCustomer(customer);
    setIsDepositOpen(true);
  };

  const openHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
    setIsHistoryOpen(true);
  };

  const openPayment = (customer: Customer) => {
    setPaymentCustomer(customer);
    setIsPaymentOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer</h1>
            <p className="text-muted-foreground">Kelola data customer Anda</p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-bg text-primary-foreground glow-effect">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Customer
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau telepon..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="End User">End User</SelectItem>
                  <SelectItem value="Reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length === 0 ? (
            <Card className="glass-card col-span-full">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Tidak ada customer ditemukan</p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="glass-card card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{customer.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            customer.customer_type === 'Reseller'
                              ? 'bg-accent/20 text-accent border-accent'
                              : 'bg-info/20 text-info border-info'
                          }
                        >
                          {customer.customer_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Deposit Balance */}
                  <div className="mt-3 p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Wallet className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">Saldo Deposit</span>
                      </div>
                      <span className={`font-semibold font-mono-numbers ${customer.deposit_balance > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {formatCurrency(customer.deposit_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => openDeposit(customer)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Deposit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => openHistory(customer)}
                    >
                      <History className="h-3 w-3 mr-1" />
                      Riwayat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => openPayment(customer)}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Bayar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Customer</Label>
                <Input
                  placeholder="Nama customer"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipe Customer</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as CustomerType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="End User">End User</SelectItem>
                    <SelectItem value="Reseller">Reseller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>No. Telepon (Opsional)</Label>
                <Input
                  placeholder="08xxxxxxxxxx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Alamat (Opsional)</Label>
                <Textarea
                  placeholder="Alamat lengkap"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="gradient-bg text-primary-foreground"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deposit Dialog */}
        {depositCustomer && (
          <DepositDialog
            customer={depositCustomer}
            open={isDepositOpen}
            onOpenChange={setIsDepositOpen}
            onSuccess={fetchCustomers}
          />
        )}

        {/* Deposit History Dialog */}
        {historyCustomer && (
          <DepositHistoryDialog
            customer={historyCustomer}
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
          />
        )}

        {/* Mass Payment Dialog */}
        {paymentCustomer && (
          <MassPaymentDialog
            customer={paymentCustomer}
            open={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            onSuccess={fetchCustomers}
          />
        )}
      </div>
    </MainLayout>
  );
}
