-- Add file_name column to transaction_items table for storing file title/description
ALTER TABLE public.transaction_items 
ADD COLUMN file_name text DEFAULT NULL;

-- Add comment to describe the column purpose
COMMENT ON COLUMN public.transaction_items.file_name IS 'Judul file atau keterangan untuk produk, terutama untuk produk print/custom';