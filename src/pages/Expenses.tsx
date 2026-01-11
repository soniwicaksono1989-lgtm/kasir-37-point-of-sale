import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, Search, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Expense } from '@/types/database';

const EXPENSE_CATEGORIES = [
  'Bahan Baku & Tinta',
  'Servis & Sparepart Mesin',
  'Listrik, Air & Internet',
  'Makan',
  'Gaji Karyawan',
  'Operasional (ATK, Kebersihan, Keamanan)',
  'Sewa Ruko / Gedung',
  'Bensin & Ongkir',
  'Pemasaran / Iklan',
  'Lain-lain',
] as const;

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (error) {
      toast.error('Gagal memuat pengeluaran');
      return;
    }

    setExpenses(data || []);
  };

  const filteredExpenses = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (expense.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const openCreateDialog = () => {
    setEditingExpense(null);
    setFormDescription('');
    setFormAmount(0);
    setFormCategory('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDescription(expense.description);
    setFormAmount(expense.amount);
    setFormCategory(expense.category || '');
    setFormDate(expense.expense_date);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formDescription.trim() || formAmount <= 0) {
      toast.error('Deskripsi dan jumlah wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      const expenseData = {
        description: formDescription.trim(),
        amount: formAmount,
        category: formCategory.trim() || null,
        expense_date: formDate,
        created_by: user?.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Pengeluaran berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData);

        if (error) throw error;
        toast.success('Pengeluaran berhasil ditambahkan');
      }

      fetchExpenses();
      setIsDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menyimpan pengeluaran', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pengeluaran berhasil dihapus');
      fetchExpenses();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menghapus pengeluaran', { description: errorMessage });
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
    });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pengeluaran</h1>
            <p className="text-muted-foreground">Catat dan kelola pengeluaran bisnis</p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-bg text-primary-foreground glow-effect">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengeluaran
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <Wallet className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-destructive font-mono-numbers">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari deskripsi atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Daftar Pengeluaran ({filteredExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Tidak ada pengeluaran ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(expense.expense_date)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {expense.category || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers text-destructive font-semibold">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(expense.id)}
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  placeholder="Deskripsi pengeluaran"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      </div>
    </MainLayout>
  );
}
