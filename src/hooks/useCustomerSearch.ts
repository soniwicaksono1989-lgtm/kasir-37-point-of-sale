import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/database';

export function useCustomerSearch(searchQuery: string, debounceMs: number = 300) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .order('name')
          .limit(10);

        if (error) {
          console.error('Error searching customers:', error);
          return;
        }

        setCustomers((data || []).map(c => ({
          ...c,
          customer_type: c.customer_type as Customer['customer_type'],
          deposit_balance: Number(c.deposit_balance) || 0,
        })));
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debounceMs]);

  return { customers, isLoading };
}
