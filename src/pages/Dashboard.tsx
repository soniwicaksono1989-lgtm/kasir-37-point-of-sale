import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  AlertCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { transactionsStorage, expensesStorage } from '@/lib/localStorage';
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

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  totalPiutang: number;
  totalTransactions: number;
  revenueChange: number;
}

interface ChartData {
  date: string;
  revenue: number;
  expenses: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPiutang: 0,
    totalTransactions: 0,
    revenueChange: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const fetchDashboardData = () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const allTransactions = transactionsStorage.getAll();
      const transactions = allTransactions.filter(t => 
        t.created_at >= startOfMonth && t.created_at <= endOfMonth
      );

      const allExpenses = expensesStorage.getAll();
      const startDate = startOfMonth.split('T')[0];
      const endDate = endOfMonth.split('T')[0];
      const expenses = allExpenses.filter(e => 
        e.expense_date >= startDate && e.expense_date <= endDate
      );

      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount_paid), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalPiutang = transactions
        .filter(t => t.status !== 'Lunas')
        .reduce((sum, t) => sum + (Number(t.total_price) - Number(t.amount_paid)), 0);
      const totalTransactions = transactions.length;

      setStats({ totalRevenue, totalExpenses, totalPiutang, totalTransactions, revenueChange: 0 });

      // Chart data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartDataMap = last7Days.map(date => {
        const dayTransactions = allTransactions.filter(t => t.created_at.split('T')[0] === date);
        const dayExpenses = allExpenses.filter(e => e.expense_date === date);
        return {
          date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          revenue: dayTransactions.reduce((sum, t) => sum + Number(t.amount_paid), 0),
          expenses: dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        };
      });
      setChartData(chartDataMap);
      setRecentTransactions(allTransactions.slice(0, 5));
    } catch (error) {
      console.error('Dashboard data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const statCards = [
    { title: 'Pendapatan Bulan Ini', value: stats.totalRevenue, icon: DollarSign, color: 'text-success', bgColor: 'bg-success/10' },
    { title: 'Pengeluaran', value: stats.totalExpenses, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { title: 'Total Piutang', value: stats.totalPiutang, icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10' },
    { title: 'Total Transaksi', value: stats.totalTransactions, icon: ShoppingCart, color: 'text-info', bgColor: 'bg-info/10', isCurrency: false },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Ringkasan bisnis Anda hari ini</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Card key={index} className="glass-card card-hover">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-lg sm:text-xl font-bold font-mono-numbers ${card.color} truncate`}>
                      {card.isCurrency === false ? card.value : formatCurrency(card.value)}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Trend Pendapatan (7 Hari Terakhir)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Pendapatan']} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg">Transaksi Terbaru</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium text-sm text-foreground">{transaction.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{transaction.customer_name || 'Walk-in Customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm font-mono-numbers text-primary">{formatCurrency(transaction.total_price)}</p>
                        <Badge variant="outline" className={transaction.status === 'Lunas' ? 'status-lunas' : transaction.status === 'DP' ? 'status-dp' : 'status-piutang'}>{transaction.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
