import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Product, ProductCategory, ProductUnit } from '@/types/database';

const categories: ProductCategory[] = ['Print', 'Stok', 'Paket', 'Custom'];
const units: ProductUnit[] = ['m2', 'pcs', 'lembar', 'box'];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Stok');
  const [formPriceReseller, setFormPriceReseller] = useState<number>(0);
  const [formPriceEndUser, setFormPriceEndUser] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formUnit, setFormUnit] = useState<ProductUnit>('pcs');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Gagal memuat produk');
      return;
    }

    setProducts((data || []).map(p => ({
      ...p,
      category: p.category as ProductCategory,
      unit: p.unit as ProductUnit
    })));
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Stok');
    setFormPriceReseller(0);
    setFormPriceEndUser(0);
    setFormStock(0);
    setFormUnit('pcs');
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPriceReseller(product.price_reseller);
    setFormPriceEndUser(product.price_end_user);
    setFormStock(product.stock);
    setFormUnit(product.unit);
    setFormIsActive(product.is_active);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Nama produk wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      const productData = {
        name: formName.trim(),
        category: formCategory,
        price_reseller: formPriceReseller,
        price_end_user: formPriceEndUser,
        stock: formStock,
        unit: formUnit,
        is_active: formIsActive,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produk berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Produk berhasil ditambahkan');
      }

      fetchProducts();
      setIsDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menyimpan produk', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Produk berhasil dihapus');
      fetchProducts();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menghapus produk', { description: errorMessage });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produk</h1>
            <p className="text-muted-foreground">Kelola daftar produk Anda</p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-bg text-primary-foreground glow-effect">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Daftar Produk ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga Reseller</TableHead>
                    <TableHead className="text-right">Harga End User</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Tidak ada produk ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers">
                          {formatCurrency(product.price_reseller)}
                        </TableCell>
                        <TableCell className="text-right font-mono-numbers">
                          {formatCurrency(product.price_end_user)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.stock} {product.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'outline'}>
                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(product.id)}
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Produk</Label>
                <Input
                  placeholder="Nama produk"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ProductCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Satuan</Label>
                  <Select value={formUnit} onValueChange={(v) => setFormUnit(v as ProductUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Harga Reseller</Label>
                  <Input
                    type="number"
                    value={formPriceReseller || ''}
                    onChange={(e) => setFormPriceReseller(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Harga End User</Label>
                  <Input
                    type="number"
                    value={formPriceEndUser || ''}
                    onChange={(e) => setFormPriceEndUser(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stok</Label>
                <Input
                  type="number"
                  value={formStock || ''}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
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
      </div>
    </MainLayout>
  );
}
