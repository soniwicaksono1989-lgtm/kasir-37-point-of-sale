import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Calendar, TrendingUp, TrendingDown, DollarSign, AlertCircle, Filter } from 'lucide-react';
import { transactionsApi, expensesApi } from '@/lib/neonApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Transaction, Expense } from '@/types/database';

interface ReportStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalPiutang: number;
}

export default function Reports() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<string>('full');
  const [stats, setStats] = useState<ReportStats>({ totalRevenue: 0, totalExpenses: 0, netIncome: 0, totalPiutang: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchReportStats();
  }, [startDate, endDate]);

  const fetchReportStats = async () => {
    setIsLoading(true);
    try {
      const [allTransactions, allExpenses] = await Promise.all([
        transactionsApi.getAll(),
        expensesApi.getAll(),
      ]);

      // Filter by date range
      const transactions = allTransactions.filter((t: Transaction) => {
        const date = t.created_at.split('T')[0];
        return date >= startDate && date <= endDate;
      });

      const expenses = allExpenses.filter((e: Expense) => {
        return e.expense_date >= startDate && e.expense_date <= endDate;
      });

      const totalRevenue = transactions.reduce((sum: number, t: Transaction) => sum + Number(t.amount_paid), 0);
      const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);
      const totalPiutang = transactions
        .filter((t: Transaction) => t.status !== 'Lunas')
        .reduce((sum: number, t: Transaction) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0);

      setStats({
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        totalPiutang,
      });
    } catch (error) {
      console.error('Error fetching report stats:', error);
      toast.error('Gagal memuat statistik laporan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    setIsExporting(true);
    try {
      const [allTransactions, allExpenses] = await Promise.all([
        transactionsApi.getAll(),
        expensesApi.getAll(),
      ]);

      // Filter by date range
      const transactions = allTransactions.filter((t: Transaction) => {
        const date = t.created_at.split('T')[0];
        return date >= startDate && date <= endDate;
      });

      const expenses = allExpenses.filter((e: Expense) => {
        return e.expense_date >= startDate && e.expense_date <= endDate;
      });

      const wb = XLSX.utils.book_new();

      if (type === 'transactions' || type === 'full') {
        const txData = transactions.map((t: Transaction) => ({
          'Invoice': t.invoice_number,
          'Customer': t.customer_name || 'Walk-in',
          'Tipe': t.customer_type,
          'Total': t.total_price,
          'Dibayar': t.amount_paid,
          'Sisa': Number(t.total_price) - Number(t.amount_paid),
          'Status': t.status,
          'Tanggal': new Date(t.created_at).toLocaleDateString('id-ID'),
        }));
        const txSheet = XLSX.utils.json_to_sheet(txData);
        XLSX.utils.book_append_sheet(wb, txSheet, 'Transaksi');
      }

      if (type === 'expenses' || type === 'full') {
        const expData = expenses.map((e: Expense) => ({
          'Deskripsi': e.description,
          'Kategori': e.category || '-',
          'Jumlah': e.amount,
          'Tanggal': e.expense_date,
        }));
        const expSheet = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, expSheet, 'Pengeluaran');
      }

      if (type === 'full') {
        const summaryData = [
          { 'Keterangan': 'Total Pendapatan', 'Nilai': stats.totalRevenue },
          { 'Keterangan': 'Total Pengeluaran', 'Nilai': stats.totalExpenses },
          { 'Keterangan': 'Laba Bersih', 'Nilai': stats.netIncome },
          { 'Keterangan': 'Total Piutang', 'Nilai': stats.totalPiutang },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');
      }

      XLSX.writeFile(wb, `Laporan_${startDate}_${endDate}.xlsx`);
      toast.success('Laporan berhasil diekspor!');
    } catch (error) {
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
    { title: 'Total Pendapatan', value: stats.totalRevenue, icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/20' },
    { title: 'Total Pengeluaran', value: stats.totalExpenses, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/20' },
    { title: 'Laba Bersih', value: stats.netIncome, icon: DollarSign, color: stats.netIncome >= 0 ? 'text-success' : 'text-destructive', bgColor: stats.netIncome >= 0 ? 'bg-success/20' : 'bg-destructive/20' },
    { title: 'Total Piutang', value: stats.totalPiutang, icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/20' },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan Keuangan</h1>
          <p className="text-muted-foreground">Analisis dan ekspor data transaksi serta pengeluaran</p>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipe Laporan</Label>
                <Select value={reportType} onValueChange={setReportType}>
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
                <Label>&nbsp;</Label>
                <Button
                  onClick={() => handleExport(reportType)}
                  disabled={isExporting}
                  className="w-full gradient-bg text-primary-foreground"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Mengekspor...' : 'Export Excel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Memuat statistik...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className={`text-2xl font-bold font-mono-numbers ${stat.color}`}>
                        {formatCurrency(stat.value)}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card card-hover cursor-pointer" onClick={() => handleExport('transactions')}>
            <CardContent className="p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold">Export Transaksi</h3>
              <p className="text-sm text-muted-foreground">Data penjualan dan pembayaran</p>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover cursor-pointer" onClick={() => handleExport('expenses')}>
            <CardContent className="p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-destructive" />
              <h3 className="font-semibold">Export Pengeluaran</h3>
              <p className="text-sm text-muted-foreground">Data biaya operasional</p>
            </CardContent>
          </Card>
          <Card className="glass-card card-hover cursor-pointer" onClick={() => handleExport('full')}>
            <CardContent className="p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-success" />
              <h3 className="font-semibold">Export Lengkap</h3>
              <p className="text-sm text-muted-foreground">Semua data + ringkasan</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
