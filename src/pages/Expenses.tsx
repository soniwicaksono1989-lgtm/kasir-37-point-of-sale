import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, Search, Calendar } from 'lucide-react';
import { expensesApi } from '@/lib/neonApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Expense } from '@/types/database';

const EXPENSE_CATEGORIES = [
  'Operasional',
  'Gaji',
  'Listrik',
  'Internet',
  'Bahan Baku',
  'Transportasi',
  'Maintenance',
  'Marketing',
  'Lainnya',
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Form state
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('Operasional');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsFetching(true);
    try {
      const data = await expensesApi.getAll();
      setExpenses(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal memuat pengeluaran', { description: errorMessage });
    } finally {
      setIsFetching(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const openCreateDialog = () => {
    setEditingExpense(null);
    setFormDescription('');
    setFormAmount(0);
    setFormCategory('Operasional');
    setFormDate(new Date().toISOString().split('T')[0]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDescription(expense.description);
    setFormAmount(expense.amount);
    setFormCategory(expense.category || 'Operasional');
    setFormDate(expense.expense_date);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formDescription.trim()) {
      toast.error('Deskripsi wajib diisi');
      return;
    }
    if (formAmount <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    setIsLoading(true);

    try {
      const expenseData = {
        description: formDescription.trim(),
        amount: formAmount,
        category: formCategory,
        expense_date: formDate,
        created_by: 'local-user-001',
      };

      if (editingExpense) {
        await expensesApi.update(editingExpense.id, expenseData);
        toast.success('Pengeluaran berhasil diperbarui');
      } else {
        await expensesApi.create(expenseData);
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
      await expensesApi.delete(id);
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
            <p className="text-muted-foreground">Catat dan kelola pengeluaran operasional</p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-bg text-primary-foreground glow-effect">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengeluaran
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive font-mono-numbers">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengeluaran..."
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
            <CardTitle>Daftar Pengeluaran ({filteredExpenses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : (
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
                          <TableCell>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.category || '-'}</TableCell>
                          <TableCell className="text-right font-mono-numbers text-destructive">
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
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Input
                  placeholder="Deskripsi pengeluaran"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
