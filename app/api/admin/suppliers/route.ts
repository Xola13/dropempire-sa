import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const supplier = searchParams.get('supplier')

    // Get aggregated supplier stats from products and orders
    let productsQuery = supabaseAdmin
      .from('products')
      .select('supplier, cost_price, selling_price, margin_percent, orders_count, stock_status')

    if (supplier) {
      productsQuery = productsQuery.eq('supplier', supplier)
    }

    const { data: products, error } = await productsQuery

    if (error) throw error

    // Aggregate by supplier
    const supplierMap: Record<string, {
      supplier: string
      totalProducts: number
      publishedProducts: number
      avgMargin: number
      avgDeliveryDays: number
      totalOrders: number
      inStock: number
      outOfStock: number
    }> = {}

    const deliveryDays: Record<string, number> = {
      aliexpress: 20,
      cj: 11,
      makro: 3,
    }

    for (const product of (products || [])) {
      if (!supplierMap[product.supplier]) {
        supplierMap[product.supplier] = {
          supplier: product.supplier,
          totalProducts: 0,
          publishedProducts: 0,
          avgMargin: 0,
          avgDeliveryDays: deliveryDays[product.supplier] || 14,
          totalOrders: 0,
          inStock: 0,
          outOfStock: 0,
        }
      }
      const s = supplierMap[product.supplier]
      s.totalProducts++
      s.avgMargin += product.margin_percent
      s.totalOrders += product.orders_count || 0
      if (product.stock_status === 'out_of_stock') s.outOfStock++
      else s.inStock++
    }

    // Average out margin
    Object.values(supplierMap).forEach(s => {
      if (s.totalProducts > 0) {
        s.avgMargin = s.avgMargin / s.totalProducts
      }
    })

    const supplierStats = Object.values(supplierMap)

    return NextResponse.json({ suppliers: supplierStats })
  } catch (err) {
    console.error('Admin suppliers GET error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch supplier data' },
      { status: 500 }
    )
  }
}
