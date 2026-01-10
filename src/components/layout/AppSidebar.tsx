import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('admin' | 'kasir')[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { title: 'Penjualan (POS)', href: '/pos', icon: ShoppingCart, roles: ['admin', 'kasir'] },
  { title: 'Produk', href: '/products', icon: Package, roles: ['admin'] },
  { title: 'Customer', href: '/customers', icon: Users, roles: ['admin', 'kasir'] },
  { title: 'Riwayat Transaksi', href: '/transactions', icon: Receipt, roles: ['admin', 'kasir'] },
  { title: 'Laporan', href: '/reports', icon: BarChart3, roles: ['admin'] },
  { title: 'Pengeluaran', href: '/expenses', icon: Wallet, roles: ['admin'] },
  { title: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut, user } = useAuth();

  const filteredNavItems = navItems.filter((item) => 
    role && item.roles.includes(role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const content = (
      <button
        onClick={() => navigate(item.href)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent group',
          isActive && 'bg-sidebar-accent text-sidebar-primary',
          !isActive && 'text-sidebar-foreground'
        )}
      >
        <Icon className={cn(
          'h-5 w-5 flex-shrink-0 transition-colors',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground group-hover:text-sidebar-primary'
        )} />
        {!collapsed && (
          <span className={cn(
            'font-medium text-sm transition-colors',
            isActive && 'text-sidebar-primary'
          )}>
            {item.title}
          </span>
        )}
        {isActive && (
          <div className="ml-auto w-1 h-4 rounded-full bg-sidebar-primary" />
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col sidebar-transition',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">KASIR 37</h1>
              <p className="text-xs text-muted-foreground capitalize">{role || 'Loading...'}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mx-auto">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="p-3 space-y-2">
        {/* User info */}
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        )}

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Keluar</span>}
        </Button>
      </div>
    </aside>
  );
}
