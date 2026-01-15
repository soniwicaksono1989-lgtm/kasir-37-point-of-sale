import { useState, useRef, useEffect } from 'react';
import { Search, User, Phone, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customersStorage } from '@/lib/localStorage';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

interface CustomerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomerId?: string | null;
  className?: string;
}

export function CustomerSearchInput({
  value,
  onChange,
  onSelectCustomer,
  selectedCustomerId,
  className
}: CustomerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search customers from localStorage
  useEffect(() => {
    if (inputValue.trim()) {
      const results = customersStorage.search(inputValue);
      setCustomers(results);
    } else {
      setCustomers([]);
    }
  }, [inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setInputValue(customer.name);
    onChange(customer.name);
    onSelectCustomer(customer);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Label className="mb-2 block">Nama Customer</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau no. telepon..."
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.trim() && setIsOpen(true)}
          className="pl-10 pr-10"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && customers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {customers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-secondary/80 transition-colors flex items-start gap-3",
                selectedCustomerId === customer.id && "bg-primary/10"
              )}
              onClick={() => handleSelectCustomer(customer)}
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {customer.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </span>
                  )}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    customer.customer_type === 'Reseller' 
                      ? "bg-accent/20 text-accent" 
                      : "bg-info/20 text-info"
                  )}>
                    {customer.customer_type}
                  </span>
                  {customer.deposit_balance > 0 && (
                    <span className="flex items-center gap-1 text-success">
                      <Wallet className="h-3 w-3" />
                      {formatCurrency(customer.deposit_balance)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && inputValue.trim() && customers.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
          Tidak ada customer ditemukan
        </div>
      )}
    </div>
  );
}
