import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { exportTransactionsToExcel, exportExpensesToExcel, exportFullReportToExcel } from '@/lib/excelExport';

interface ReportStats {
  totalRevenue: number;
  totalExpenses: number;
  totalPiutang: number;
  netIncome: number;
  transactionCount: number;
}

export default function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportType, setReportType] = useState<'transactions' | 'expenses' | 'full'>('full');
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPiutang: 0,
    netIncome: 0,
    transactionCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchReportStats();
  }, [startDate, endDate]);

  const fetchReportStats = async () => {
    setIsLoading(true);
    try {
      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount_paid), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalPiutang = transactions
        ?.filter((t) => t.status !== 'Lunas')
        .reduce((sum, t) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0) || 0;

      setStats({
        totalRevenue,
        totalExpenses,
        totalPiutang,
        netIncome: totalRevenue - totalExpenses,
        transactionCount: transactions?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (reportType === 'transactions') {
        await exportTransactionsToExcel(startDate, endDate);
        toast.success('Laporan transaksi berhasil diunduh!');
      } else if (reportType === 'expenses') {
        await exportExpensesToExcel(startDate, endDate);
        toast.success('Laporan pengeluaran berhasil diunduh!');
      } else {
        await exportFullReportToExcel(startDate, endDate);
        toast.success('Laporan lengkap berhasil diunduh!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor laporan');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Pendapatan',
      value: stats.totalRevenue,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Pengeluaran',
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Laba Bersih',
      value: stats.netIncome,
      icon: DollarSign,
      color: stats.netIncome >= 0 ? 'text-success' : 'text-destructive',
      bgColor: stats.netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10',
    },
    {
      title: 'Piutang',
      value: stats.totalPiutang,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Laporan Keuangan</h1>
            <p className="text-muted-foreground">
              Ekspor data transaksi dan pengeluaran ke Excel
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Akhir</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jenis Laporan</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Laporan Lengkap</SelectItem>
                    <SelectItem value="transactions">Transaksi Saja</SelectItem>
                    <SelectItem value="expenses">Pengeluaran Saja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="invisible">Action</Label>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full gradient-bg text-primary-foreground"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold font-mono-numbers ${card.color}`}>
                      {isLoading ? '...' : formatCurrency(card.value)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('transactions'); handleExport(); }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <FileSpreadsheet className="h-8 w-8 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Laporan Transaksi</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.transactionCount} transaksi dalam periode
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('expenses'); handleExport(); }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <FileSpreadsheet className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Laporan Pengeluaran</h3>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('full'); handleExport(); }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Laporan Lengkap</h3>
                  <p className="text-sm text-muted-foreground">
                    Transaksi + Pengeluaran
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="border-info/50 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-info mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Tentang Ekspor Excel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  File Excel akan berisi kolom: Nama Customer, Tanggal, Total Harga, Status Pembayaran, 
                  dan Detail Produk. Cocok untuk keperluan rekonsiliasi dan pelaporan keuangan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
