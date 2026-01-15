import { useState, useEffect, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  Receipt,
  Calculator,
  Package,
  PenLine,
  Printer,
  CheckCircle2,
  Download,
  Loader2
} from 'lucide-react';
import { 
  productsStorage, 
  customersStorage, 
  transactionsStorage, 
  transactionItemsStorage,
  paymentsStorage,
  storeSettingsStorage,
  StoreSettings
} from '@/lib/localStorage';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Product, CartItem, Customer, CustomerType, TransactionStatus, getMarkupWidth } from '@/types/database';
import { ThermalReceipt } from '@/components/pos/ThermalReceipt';
import { POSTransaction, POSCartItem } from '@/lib/pdfGenerator';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [customerType, setCustomerType] = useState<CustomerType>('End User');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomProductOpen, setIsCustomProductOpen] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductPrice, setCustomProductPrice] = useState<number>(0);
  const [customProductQty, setCustomProductQty] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);

  // Success modal state
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<POSTransaction | null>(null);
  const [lastCartItems, setLastCartItems] = useState<POSCartItem[]>([]);
  
  // Print states
  const [isPrinting, setIsPrinting] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const thermalReceiptRef = useRef<HTMLDivElement>(null);

  // Print product dimension inputs
  const [printLength, setPrintLength] = useState<number>(0);
  const [printWidth, setPrintWidth] = useState<number>(0);
  const [selectedPrintProduct, setSelectedPrintProduct] = useState<Product | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    const data = productsStorage.getAll().filter(p => p.is_active);
    setProducts(data);
  };

  // Customer search effect
  useEffect(() => {
    if (customerSearchQuery.trim()) {
      const results = customersStorage.search(customerSearchQuery);
      setCustomerSearchResults(results);
    } else {
      setCustomerSearchResults([]);
    }
  }, [customerSearchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const getProductPrice = (product: Product): number => {
    return customerType === 'Reseller' ? product.price_reseller : product.price_end_user;
  };

  // Recalculate cart prices when customer type changes
  useEffect(() => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.type === 'product' && item.product) {
          const newPrice = getProductPrice(item.product);
          
          if (item.product.category === 'Print' && item.length && item.real_width) {
            const area = item.length * item.real_width;
            return {
              ...item,
              unit_price: newPrice,
              subtotal: area * newPrice * item.quantity,
            };
          }
          
          return {
            ...item,
            unit_price: newPrice,
            subtotal: newPrice * item.quantity,
          };
        }
        return item;
      })
    );
  }, [customerType]);

  const addProductToCart = (product: Product) => {
    if (product.category === 'Print') {
      setSelectedPrintProduct(product);
      setPrintLength(0);
      setPrintWidth(0);
      setIsPrintDialogOpen(true);
      return;
    }

    const existingIndex = cart.findIndex(
      (item) => item.type === 'product' && item.product_id === product.id
    );

    if (existingIndex >= 0) {
      updateCartQuantity(existingIndex, cart[existingIndex].quantity + 1);
    } else {
      const price = getProductPrice(product);
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        type: 'product',
        product_id: product.id,
        product: product,
        quantity: 1,
        unit_price: price,
        subtotal: price,
      };
      setCart([...cart, newItem]);
    }
  };

  const addPrintProductToCart = () => {
    if (!selectedPrintProduct || printLength <= 0 || printWidth <= 0) {
      toast.error('Masukkan panjang dan lebar yang valid');
      return;
    }

    const realWidth = getMarkupWidth(printWidth);
    const price = getProductPrice(selectedPrintProduct);
    const area = printLength * realWidth;
    const subtotal = area * price;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      type: 'product',
      product_id: selectedPrintProduct.id,
      product: selectedPrintProduct,
      length: printLength,
      width: printWidth,
      real_width: realWidth,
      quantity: 1,
      unit_price: price,
      subtotal: subtotal,
    };

    setCart([...cart, newItem]);
    setIsPrintDialogOpen(false);
    setSelectedPrintProduct(null);
    setPrintLength(0);
    setPrintWidth(0);
  };

  const addCustomProduct = () => {
    if (!customProductName.trim() || customProductPrice <= 0) {
      toast.error('Masukkan nama dan harga yang valid');
      return;
    }

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      type: 'custom',
      custom_name: customProductName,
      quantity: customProductQty,
      unit_price: customProductPrice,
      subtotal: customProductPrice * customProductQty,
    };

    setCart([...cart, newItem]);
    setIsCustomProductOpen(false);
    setCustomProductName('');
    setCustomProductPrice(0);
    setCustomProductQty(1);
  };

  const updateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item, i) => {
        if (i === index) {
          if (item.type === 'product' && item.product?.category === 'Print' && item.length && item.real_width) {
            const area = item.length * item.real_width;
            return {
              ...item,
              quantity: newQuantity,
              subtotal: area * item.unit_price * newQuantity,
            };
          }
          return {
            ...item,
            quantity: newQuantity,
            subtotal: item.unit_price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const updateCartFileName = (index: number, fileName: string) => {
    setCart((prevCart) =>
      prevCart.map((item, i) => {
        if (i === index) {
          return { ...item, file_name: fileName };
        }
        return item;
      })
    );
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const validatedDiscount = useMemo(() => {
    return Math.min(Math.max(0, discountAmount), cartSubtotal);
  }, [discountAmount, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return cartSubtotal - validatedDiscount;
  }, [cartSubtotal, validatedDiscount]);

  const change = useMemo(() => {
    return amountPaid - cartTotal;
  }, [amountPaid, cartTotal]);

  const transactionStatus: TransactionStatus = useMemo(() => {
    if (amountPaid >= cartTotal) return 'Lunas';
    if (amountPaid > 0) return 'DP';
    return 'Piutang';
  }, [amountPaid, cartTotal]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    setIsProcessing(true);

    try {
      // Create transaction
      const transaction = transactionsStorage.create({
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName || null,
        customer_type: customerType,
        total_price: cartTotal,
        amount_paid: amountPaid,
        status: transactionStatus,
        notes: notes || null,
        created_by: 'local-user-001',
      });

      // Create transaction items
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.type === 'product' ? item.product_id || null : null,
        custom_name: item.type === 'custom' ? item.custom_name || null : null,
        file_name: item.file_name || null,
        length: item.length || null,
        width: item.width || null,
        real_width: item.real_width || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      transactionItemsStorage.createMany(items);

      // Create initial payment if amount paid > 0
      if (amountPaid > 0) {
        paymentsStorage.create({
          transaction_id: transaction.id,
          amount: amountPaid,
          payment_method: 'Cash',
          notes: null,
          created_by: 'local-user-001',
        });
      }

      // Prepare data for success modal
      const posTransaction: POSTransaction = {
        invoice_number: transaction.invoice_number,
        customer_name: customerName || null,
        customer_type: customerType,
        total_price: cartTotal,
        amount_paid: amountPaid,
        discount_amount: validatedDiscount,
        status: transactionStatus,
        notes: notes || null,
        created_at: transaction.created_at,
      };

      const posCartItems: POSCartItem[] = cart.map((item) => ({
        id: item.id,
        type: item.type,
        product_id: item.product_id,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          unit: item.product.unit,
        } : undefined,
        custom_name: item.custom_name,
        file_name: item.file_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        length: item.length,
        width: item.width,
        real_width: item.real_width,
      }));

      setLastTransaction(posTransaction);
      setLastCartItems(posCartItems);

      setIsCheckoutOpen(false);
      setIsSuccessOpen(true);

      // Reset form
      setCart([]);
      setCustomerName('');
      setSelectedCustomer(null);
      setAmountPaid(0);
      setDiscountAmount(0);
      setNotes('');

      toast.success('Transaksi berhasil disimpan!');

    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error('Gagal menyimpan transaksi', { description: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch store settings when success modal opens
  useEffect(() => {
    if (isSuccessOpen && !storeSettings) {
      setStoreSettings(storeSettingsStorage.get());
    }
  }, [isSuccessOpen]);

  const handleDownloadA5 = () => {
    toast.info('Fitur download PDF tidak tersedia dalam mode offline');
  };

  const handleThermalPrint = useReactToPrint({
    contentRef: thermalReceiptRef,
    documentTitle: `Struk_${lastTransaction?.invoice_number || 'thermal'}`,
    onBeforePrint: async () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      toast.success('Dialog cetak thermal dibuka');
    },
    onPrintError: (errorLocation, error) => {
      console.error('Print error:', errorLocation, error);
      setIsPrinting(false);
      toast.error('Gagal mencetak nota thermal');
    },
  });

  const closeSuccessModal = () => {
    setIsSuccessOpen(false);
    setLastTransaction(null);
    setLastCartItems([]);
    setStoreSettings(null);
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
      <div className="h-screen flex flex-col lg:flex-row">
        {/* Product List - Left Side */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
          {/* Header */}
          <div className="mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Penjualan</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={customerType === 'Reseller' ? 'bg-accent/20 text-accent border-accent' : 'bg-info/20 text-info border-info'}>
                  {customerType}
                </Badge>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-glow"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Print">Print</SelectItem>
                  <SelectItem value="Stok">Stok</SelectItem>
                  <SelectItem value="Paket">Paket</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isCustomProductOpen} onOpenChange={setIsCustomProductOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <PenLine className="h-4 w-4" />
                    <span className="hidden sm:inline">Produk Custom</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Produk Custom</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nama Produk</Label>
                      <Input
                        placeholder="Nama produk custom"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Harga</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customProductPrice || ''}
                          onChange={(e) => setCustomProductPrice(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customProductQty}
                          onChange={(e) => setCustomProductQty(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addCustomProduct} className="gradient-bg text-primary-foreground">
                      Tambah ke Keranjang
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="glass-card card-hover cursor-pointer group"
                  onClick={() => addProductToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col h-full">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      <Badge variant="secondary" className="w-fit text-xs mb-2">
                        {product.category}
                      </Badge>
                      <p className="text-primary font-semibold text-sm mt-auto font-mono-numbers">
                        {formatCurrency(getProductPrice(product))}
                        {product.category === 'Print' && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
                      </p>
                      {product.category !== 'Print' && (
                        <p className="text-xs text-muted-foreground">
                          Stok: {product.stock} {product.unit}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart - Right Side */}
        <div className="w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Keranjang</h2>
                <Badge className="bg-primary/20 text-primary">{cart.length}</Badge>
              </div>
            </div>

            {/* Customer Type Toggle */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={customerType} onValueChange={(v) => setCustomerType(v as CustomerType)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="End User">End User</SelectItem>
                  <SelectItem value="Reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                <p>Keranjang kosong</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <Card key={item.id} className="glass-card">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {item.type === 'custom' ? item.custom_name : item.product?.name}
                          </p>
                          {item.type === 'product' && item.product?.category === 'Print' && item.length && item.width && (
                            <p className="text-xs text-muted-foreground">
                              {item.length}m × {item.width}m → {item.real_width}m (markup)
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono-numbers">
                            {formatCurrency(item.unit_price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(index, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateCartQuantity(index, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* File Name / Keterangan Input */}
                      <div className="mt-2">
                        <Input
                          placeholder="Judul File / Keterangan (opsional)"
                          value={item.file_name || ''}
                          onChange={(e) => updateCartFileName(index, e.target.value)}
                          className="h-8 text-xs"
                        />
                        {item.type === 'product' && item.product?.category === 'Print' && !item.file_name && (
                          <p className="text-xs text-warning mt-1">💡 Sebaiknya isi judul file untuk produk print</p>
                        )}
                      </div>
                      
                      <div className="mt-2 text-right">
                        <p className="font-semibold text-primary font-mono-numbers">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer */}
          <div className="p-4 border-t border-border space-y-4">
            {/* Subtotal and Discount Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-numbers">{formatCurrency(cartSubtotal)}</span>
              </div>
              {validatedDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-success">
                  <span>Diskon</span>
                  <span className="font-mono-numbers">- {formatCurrency(validatedDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary font-mono-numbers">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full h-12 gradient-bg text-primary-foreground font-semibold text-lg glow-effect"
                  disabled={cart.length === 0}
                >
                  <Receipt className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Pembayaran
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Customer Name Input */}
                  <div className="space-y-2">
                    <Label>Nama Customer</Label>
                    <Input
                      placeholder="Nama customer (opsional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  {/* Price Summary with Discount Input */}
                  <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold font-mono-numbers">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    
                    {/* Discount Input */}
                    <div className="space-y-2">
                      <Label className="text-sm">Diskon (Rp)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={discountAmount || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (value > cartSubtotal) {
                            toast.error('Diskon tidak boleh melebihi subtotal');
                            setDiscountAmount(cartSubtotal);
                          } else {
                            setDiscountAmount(Math.max(0, value));
                          }
                        }}
                        className="font-mono-numbers"
                      />
                    </div>
                    
                    {validatedDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Diskon</span>
                        <span className="font-mono-numbers">- {formatCurrency(validatedDiscount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary font-mono-numbers">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Jumlah Bayar</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className="font-mono-numbers text-lg"
                    />
                  </div>

                  {amountPaid > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {change >= 0 ? 'Kembalian' : 'Kurang'}
                        </span>
                        <span className={`font-semibold font-mono-numbers ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(change))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={
                          transactionStatus === 'Lunas' ? 'status-lunas' :
                          transactionStatus === 'DP' ? 'status-dp' : 'status-piutang'
                        }>
                          {transactionStatus}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                      placeholder="Catatan transaksi..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className="w-full gradient-bg text-primary-foreground"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Memproses...' : 'Simpan Transaksi'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Print Product Dialog */}
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Input Ukuran Print</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Produk: <span className="font-medium text-foreground">{selectedPrintProduct?.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Panjang (meter)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={printLength || ''}
                    onChange={(e) => setPrintLength(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lebar (meter)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={printWidth || ''}
                    onChange={(e) => setPrintWidth(Number(e.target.value))}
                  />
                </div>
              </div>
              {printWidth > 0 && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">
                    Lebar Markup: <span className="font-semibold text-primary">{getMarkupWidth(printWidth)} m</span>
                  </p>
                  {printLength > 0 && selectedPrintProduct && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Luas: <span className="font-semibold">{(printLength * getMarkupWidth(printWidth)).toFixed(2)} m²</span>
                      {' = '}
                      <span className="font-semibold text-primary font-mono-numbers">
                        {formatCurrency(printLength * getMarkupWidth(printWidth) * getProductPrice(selectedPrintProduct))}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={addPrintProductToCart} className="gradient-bg text-primary-foreground">
                Tambah ke Keranjang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal with Print Options */}
        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-6 w-6" />
                Transaksi Berhasil!
              </DialogTitle>
              <DialogDescription>
                Transaksi telah tersimpan. Anda dapat mencetak nota atau menutup dialog ini.
              </DialogDescription>
            </DialogHeader>
            
            {lastTransaction && (
              <div className="space-y-4 py-4">
                {/* Invoice Number */}
                <div className="p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-sm text-muted-foreground">No. Invoice</p>
                  <p className="text-xl font-bold text-primary font-mono">
                    {lastTransaction.invoice_number}
                  </p>
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{lastTransaction.customer_name || 'Walk-in'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipe</span>
                    <Badge variant="outline">{lastTransaction.customer_type}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-lg font-mono-numbers">
                      {formatCurrency(lastTransaction.total_price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dibayar</span>
                    <span className="font-mono-numbers">{formatCurrency(lastTransaction.amount_paid)}</span>
                  </div>
                  {lastTransaction.total_price - lastTransaction.amount_paid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sisa</span>
                      <span className="text-destructive font-mono-numbers">
                        {formatCurrency(lastTransaction.total_price - lastTransaction.amount_paid)}
                      </span>
                    </div>
                  )}
                  {lastTransaction.amount_paid > lastTransaction.total_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kembalian</span>
                      <span className="text-success font-mono-numbers">
                        {formatCurrency(lastTransaction.amount_paid - lastTransaction.total_price)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={
                      lastTransaction.status === 'Lunas' ? 'status-lunas' :
                      lastTransaction.status === 'DP' ? 'status-dp' : 'status-piutang'
                    }>
                      {lastTransaction.status}
                    </Badge>
                  </div>
                </div>

                {/* Print Buttons */}
                <div className="pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground text-center">Cetak Nota</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleDownloadA5}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download A5
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleThermalPrint()}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                      Cetak Thermal
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={closeSuccessModal}
              >
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hidden Thermal Receipt for react-to-print */}
        <div style={{ display: 'none' }}>
          {lastTransaction && lastCartItems.length > 0 && (
            <ThermalReceipt
              ref={thermalReceiptRef}
              transaction={lastTransaction}
              cartItems={lastCartItems}
              storeSettings={storeSettings}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
