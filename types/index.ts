// Core data types for DropEmpire SA

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  ai_description?: string
  images: string[]
  category: string
  tags: string[]
  selling_price: number
  compare_at_price?: number
  cost_price: number
  margin_percent: number
  supplier: 'aliexpress' | 'cj' | 'makro'
  supplier_product_id: string
  supplier_shipping_days: number
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock'
  orders_count: number
  is_published: boolean
  seo_title?: string
  seo_description?: string
  bullet_points?: string[]
  faqs?: Array<{ question: string; answer: string }>
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  email: string
  name: string
  phone?: string
  total_orders: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  product_id: string
  name: string
  qty: number
  unit_price: number
  supplier_cost: number
  supplier: string
  supplier_product_id: string
  variant_id?: string
  shipping_service?: string
  images?: string[]
}

export interface DeliveryAddress {
  address: string
  city: string
  province: string
  postalCode: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  customer_email: string
  customer_name: string
  customer_phone: string
  delivery_address: DeliveryAddress
  items: OrderItem[]
  subtotal: number
  shipping_cost: number
  total: number
  total_cost: number
  total_profit: number
  payment_method: 'payfast' | 'yoco'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_reference?: string
  fulfillment_status: 'unfulfilled' | 'fulfilling' | 'fulfilled'
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number?: string
  tracking_url?: string
  courier?: string
  estimated_delivery?: string
  created_at: string
  updated_at: string
}

export interface SupplierOrder {
  id: string
  order_id: string
  supplier: 'aliexpress' | 'cj' | 'makro'
  supplier_order_id?: string
  items: OrderItem[]
  total_cost: number
  shipping_address: DeliveryAddress & { name: string; phone: string; email?: string }
  status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number?: string
  placed_at?: string
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  agent: string
  action: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  reasoning?: string
  success: boolean
  error?: string
  duration_ms: number
  created_at: string
}

export interface AnalyticsDaily {
  id: string
  date: string
  revenue: number
  cost: number
  profit: number
  orders: number
  new_customers: number
  created_at: string
}

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  slug: string
  qty: number
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}

export interface PayFastParams {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  name_first: string
  name_last: string
  email_address: string
  m_payment_id: string
  amount: string
  item_name: string
  item_description: string
  signature: string
}

export interface YocoCharge {
  id: string
  status: 'successful' | 'failed' | 'pending'
  amount: number
  currency: string
  metadata?: Record<string, string>
}

export interface SupplierProduct {
  id: string
  name: string
  price: number
  priceZAR?: number
  imageUrl: string
  supplier: 'aliexpress' | 'cj' | 'makro'
  rating?: number
  reviewCount?: number
  shippingDays?: string
  url?: string
  category?: string
}

export interface TrendingProduct {
  name: string
  category: string
  demandScore: number
  reasoningNote: string
  estimatedMargin: string
  targetAudience: string
  keywords: string[]
}

export interface SourcingResult {
  bestSupplier: 'aliexpress' | 'cj' | 'makro'
  score: number
  reasoning: string
  recommendedPrice: number
  costPrice: number
  shippingCost: number
  marginPercent: number
  deliveryDays: string
  supplierProductId: string
  supplierProductUrl: string
  riskFlags: string[]
  allOptions: SupplierOption[]
}

export interface SupplierOption {
  supplier: string
  productId: string
  name: string
  costUSD: number
  costZAR: number
  shippingCostZAR: number
  totalCostZAR: number
  deliveryDays: string
  rating: number
  recommendedSellingPrice: number
  marginPercent: number
  productUrl: string
}

export interface ListingDraft {
  title: string
  slug: string
  description: string
  bulletPoints: string[]
  faqs: Array<{ question: string; answer: string }>
  tags: string[]
  category: string
  compareAtPrice: number
  seoTitle: string
  seoDescription: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface CheckoutFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryAddress: DeliveryAddress
  items: Array<{ productId: string; qty: number }>
  paymentMethod: 'payfast' | 'yoco'
}

export interface AdminStats {
  revenue: number
  profit: number
  orders: number
  activeProducts: number
  revenueChange: number
  profitChange: number
  ordersChange: number
}
