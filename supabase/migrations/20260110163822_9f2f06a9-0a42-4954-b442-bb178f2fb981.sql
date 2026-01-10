-- Create store_settings table for store identity
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'KASIR 37',
  address text,
  phone text,
  logo_url text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage store settings
CREATE POLICY "Admin can manage store settings"
ON public.store_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view store settings (for invoice header)
CREATE POLICY "Authenticated users can view store settings"
ON public.store_settings
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default store settings
INSERT INTO public.store_settings (store_name, address, phone)
VALUES ('KASIR 37', 'Jl. Contoh No. 123, Kota', '08123456789');