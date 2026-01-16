import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  AlertCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { transactionsApi, expensesApi } from '@/lib/neonApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { Transaction } from '@/types/database';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalPiutang: number;
  transactionCount: number;
}

interface ChartData {
  date: string;
  revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPiutang: 0,
    transactionCount: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get current month data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [allTransactions, allExpenses] = await Promise.all([
        transactionsApi.getAll(),
        expensesApi.getAll(),
      ]);

      // Filter for current month
      const monthTransactions = allTransactions.filter((t: Transaction) => {
        const date = t.created_at.split('T')[0];
        return date >= startOfMonth && date <= endOfMonth;
      });

      const monthExpenses = allExpenses.filter((e: { expense_date: string }) => {
        return e.expense_date >= startOfMonth && e.expense_date <= endOfMonth;
      });

      // Calculate stats
      const totalRevenue = monthTransactions.reduce((sum: number, t: Transaction) => sum + Number(t.amount_paid), 0);
      const totalExpenses = monthExpenses.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
      const totalPiutang = monthTransactions
        .filter((t: Transaction) => t.status !== 'Lunas')
        .reduce((sum: number, t: Transaction) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0);

      setStats({
        totalRevenue,
        totalExpenses,
        totalPiutang,
        transactionCount: monthTransactions.length,
      });

      // Recent transactions
      setRecentTransactions(allTransactions.slice(0, 5));

      // Chart data - last 7 days
      const last7Days: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayRevenue = allTransactions
          .filter((t: Transaction) => t.created_at.split('T')[0] === dateStr)
          .reduce((sum: number, t: Transaction) => sum + Number(t.amount_paid), 0);
        last7Days.push({
          date: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          revenue: dayRevenue,
        });
      }
      setChartData(last7Days);

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Data berhasil diperbarui');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-bg animate-pulse" />
            <p className="text-muted-foreground">Memuat dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Ringkasan bisnis bulan ini</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendapatan</p>
                  <p className="text-2xl font-bold text-success font-mono-numbers">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pengeluaran</p>
                  <p className="text-2xl font-bold text-destructive font-mono-numbers">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Piutang</p>
                  <p className="text-2xl font-bold text-warning font-mono-numbers">
                    {formatCurrency(stats.totalPiutang)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transaksi</p>
                  <p className="text-2xl font-bold text-primary font-mono-numbers">
                    {stats.transactionCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tren Pendapatan (7 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada transaksi</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-mono text-sm">{tx.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{tx.customer_name || 'Walk-in'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-numbers font-semibold">{formatCurrency(tx.total_price)}</p>
                      <Badge className={
                        tx.status === 'Lunas' ? 'status-lunas' :
                        tx.status === 'DP' ? 'status-dp' : 'status-piutang'
                      }>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
