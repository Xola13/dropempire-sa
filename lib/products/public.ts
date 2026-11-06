// Columns safe to expose to shoppers. Deliberately excludes cost_price,
// margin_percent, supplier_product_id and supplier_product_url: server-rendered
// rows passed to client components are serialized into the page, and the same
// columns are what the database grants to the anon/authenticated roles
// (see supabase/migrations/005_security_hardening.sql).
export const PUBLIC_PRODUCT_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'ai_description',
  'images',
  'category',
  'tags',
  'selling_price',
  'compare_at_price',
  'supplier',
  'supplier_shipping_days',
  'stock_status',
  'orders_count',
  'is_published',
  'seo_title',
  'seo_description',
  'bullet_points',
  'faqs',
  'created_at',
  'updated_at',
].join(', ')

// Lighter projection for list/grid views.
export const PUBLIC_PRODUCT_LIST_COLUMNS = [
  'id',
  'slug',
  'name',
  'images',
  'category',
  'selling_price',
  'compare_at_price',
  'supplier',
  'stock_status',
  'orders_count',
  'tags',
  'is_published',
  'created_at',
].join(', ')
