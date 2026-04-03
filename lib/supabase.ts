import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL — add it to .env.local')
  return url
}

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Browser client — uses anon key, respects RLS
export function getSupabase() {
  if (!_supabase) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — add it to .env.local')
    _supabase = createClient(getSupabaseUrl(), anonKey)
  }
  return _supabase
}

// Admin client — uses service role key, bypasses RLS (server-side only)
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local')
    _supabaseAdmin = createClient(getSupabaseUrl(), serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _supabaseAdmin
}

// Convenience exports — lazy, won't throw until first use
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => (getSupabase() as unknown as Record<string | symbol, unknown>)[prop],
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_, prop) => (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop],
})

// Type helper for database tables
export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          ai_description: string | null
          images: string[]
          category: string
          tags: string[]
          selling_price: number
          compare_at_price: number | null
          cost_price: number
          margin_percent: number
          supplier: 'aliexpress' | 'cj' | 'makro'
          supplier_product_id: string
          supplier_shipping_days: number
          stock_status: 'in_stock' | 'out_of_stock' | 'low_stock'
          orders_count: number
          is_published: boolean
          seo_title: string | null
          seo_description: string | null
          bullet_points: string[]
          faqs: Array<{ question: string; answer: string }>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      customers: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          total_orders: number
          total_spent: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_address: Record<string, string>
          items: Record<string, unknown>[]
          subtotal: number
          shipping_cost: number
          total: number
          total_cost: number
          total_profit: number
          payment_method: 'payfast' | 'yoco'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_reference: string | null
          fulfillment_status: 'unfulfilled' | 'fulfilling' | 'fulfilled'
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          tracking_number: string | null
          tracking_url: string | null
          courier: string | null
          estimated_delivery: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      supplier_orders: {
        Row: {
          id: string
          order_id: string
          supplier: 'aliexpress' | 'cj' | 'makro'
          supplier_order_id: string | null
          items: Record<string, unknown>[]
          total_cost: number
          shipping_address: Record<string, string>
          status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
          tracking_number: string | null
          placed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['supplier_orders']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['supplier_orders']['Insert']>
      }
      agent_logs: {
        Row: {
          id: string
          agent: string
          action: string
          input: Record<string, unknown>
          output: Record<string, unknown> | null
          reasoning: string | null
          success: boolean
          error: string | null
          duration_ms: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['agent_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['agent_logs']['Insert']>
      }
      analytics_daily: {
        Row: {
          id: string
          date: string
          revenue: number
          cost: number
          profit: number
          orders: number
          new_customers: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['analytics_daily']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['analytics_daily']['Insert']>
      }
    }
  }
}
