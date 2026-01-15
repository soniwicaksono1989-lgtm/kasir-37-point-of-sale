import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Calendar, TrendingUp, TrendingDown, DollarSign, AlertCircle, Filter } from 'lucide-react';
import { transactionsStorage, expensesStorage } from '@/lib/localStorage';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ReportStats { totalRevenue: number; totalExpenses: number; totalPiutang: number; netIncome: number; transactionCount: number; }

export default function Reports() {
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'transactions' | 'expenses' | 'full'>('full');
  const [stats, setStats] = useState<ReportStats>({ totalRevenue: 0, totalExpenses: 0, totalPiutang: 0, netIncome: 0, transactionCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { fetchReportStats(); }, [startDate, endDate]);

  const fetchReportStats = () => {
    setIsLoading(true);
    const transactions = transactionsStorage.getByDateRange(startDate, endDate);
    const expenses = expensesStorage.getByDateRange(startDate, endDate);
    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount_paid), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPiutang = transactions.filter(t => t.status !== 'Lunas').reduce((sum, t) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0);
    setStats({ totalRevenue, totalExpenses, totalPiutang, netIncome: totalRevenue - totalExpenses, transactionCount: transactions.length });
    setIsLoading(false);
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      if (reportType === 'transactions' || reportType === 'full') {
        const transactions = transactionsStorage.getByDateRange(startDate, endDate);
        const data = transactions.map(t => ({ 'No Invoice': t.invoice_number, 'Customer': t.customer_name || 'Walk-in', 'Tipe': t.customer_type, 'Total': t.total_price, 'Dibayar': t.amount_paid, 'Status': t.status, 'Tanggal': t.created_at.split('T')[0] }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
      }
      if (reportType === 'expenses' || reportType === 'full') {
        const expenses = expensesStorage.getByDateRange(startDate, endDate);
        const data = expenses.map(e => ({ 'Deskripsi': e.description, 'Kategori': e.category || '-', 'Jumlah': e.amount, 'Tanggal': e.expense_date }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
      }
      if (reportType === 'full') {
        const summary = [{ 'Keterangan': 'Total Pendapatan', 'Nilai': stats.totalRevenue }, { 'Keterangan': 'Total Pengeluaran', 'Nilai': stats.totalExpenses }, { 'Keterangan': 'Laba Bersih', 'Nilai': stats.netIncome }, { 'Keterangan': 'Total Piutang', 'Nilai': stats.totalPiutang }];
        const ws = XLSX.utils.json_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
      }
      XLSX.writeFile(wb, `Laporan_${startDate}_${endDate}.xlsx`);
      toast.success('Laporan berhasil diunduh!');
    } catch (error) { toast.error('Gagal mengekspor laporan'); }
    finally { setIsExporting(false); }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const statCards = [
    { title: 'Total Pendapatan', value: stats.totalRevenue, icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10' },
    { title: 'Total Pengeluaran', value: stats.totalExpenses, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { title: 'Laba Bersih', value: stats.netIncome, icon: DollarSign, color: stats.netIncome >= 0 ? 'text-success' : 'text-destructive', bgColor: stats.netIncome >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
    { title: 'Piutang', value: stats.totalPiutang, icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">Laporan Keuangan</h1><p className="text-muted-foreground">Ekspor data transaksi dan pengeluaran ke Excel</p></div>

        <Card className="glass-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Filter className="h-5 w-5 text-primary" />Filter Laporan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Tanggal Mulai</Label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-10" /></div></div>
              <div className="space-y-2"><Label>Tanggal Akhir</Label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-10" /></div></div>
              <div className="space-y-2"><Label>Jenis Laporan</Label><Select value={reportType} onValueChange={(v) => setReportType(v as typeof reportType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Laporan Lengkap</SelectItem><SelectItem value="transactions">Transaksi Saja</SelectItem><SelectItem value="expenses">Pengeluaran Saja</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label className="invisible">Action</Label><Button onClick={handleExport} disabled={isExporting} className="w-full gradient-bg text-primary-foreground"><Download className="h-4 w-4 mr-2" />{isExporting ? 'Mengekspor...' : 'Ekspor Excel'}</Button></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Card key={index} className="glass-card"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="space-y-2"><p className="text-sm text-muted-foreground">{card.title}</p><p className={`text-2xl font-bold font-mono-numbers ${card.color}`}>{isLoading ? '...' : formatCurrency(card.value)}</p></div><div className={`p-3 rounded-xl ${card.bgColor}`}><card.icon className={`h-6 w-6 ${card.color}`} /></div></div></CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('transactions'); handleExport(); }}><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-info/10"><FileSpreadsheet className="h-8 w-8 text-info" /></div><div><h3 className="font-semibold text-foreground">Laporan Transaksi</h3><p className="text-sm text-muted-foreground">{stats.transactionCount} transaksi dalam periode</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('expenses'); handleExport(); }}><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-destructive/10"><FileSpreadsheet className="h-8 w-8 text-destructive" /></div><div><h3 className="font-semibold text-foreground">Laporan Pengeluaran</h3><p className="text-sm text-muted-foreground">Total: {formatCurrency(stats.totalExpenses)}</p></div></div></CardContent></Card>
          <Card className="glass-card card-hover cursor-pointer" onClick={() => { setReportType('full'); handleExport(); }}><CardContent className="p-6"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-success/10"><FileSpreadsheet className="h-8 w-8 text-success" /></div><div><h3 className="font-semibold text-foreground">Laporan Lengkap</h3><p className="text-sm text-muted-foreground">Transaksi + Pengeluaran</p></div></div></CardContent></Card>
        </div>
      </div>
    </MainLayout>
  );
}
