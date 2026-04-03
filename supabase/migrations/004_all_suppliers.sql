-- Drop the old supplier constraint and allow all SA local suppliers
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_supplier_check;

ALTER TABLE products ADD CONSTRAINT products_supplier_check
  CHECK (supplier IN (
    'aliexpress',
    'cj',
    'makro',
    'takealot',
    'game',
    'bidorbuy',
    'hivve',
    'gumtree',
    'manual'
  ));
