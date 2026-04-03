import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')

  // Map sort param to actual column — only allow known columns to prevent injection
  const sortColumn =
    sort === 'price' ? 'selling_price' :
    sort === 'popular' ? 'orders_count' :
    'created_at'

  try {
    let query = supabaseAdmin
      .from('products')
      .select('id, name, slug, images, category, selling_price, compare_at_price, cost_price, margin_percent, supplier, stock_status, orders_count, tags, is_published, created_at', { count: 'exact' })
      .eq('is_published', true)

    if (search) query = query.ilike('name', `%${search}%`)
    // Use ilike for category so "electronics" matches "Electronics"
    if (category) query = query.ilike('category', `%${category}%`)
    if (minPrice) query = query.gte('selling_price', parseFloat(minPrice))
    if (maxPrice) query = query.lte('selling_price', parseFloat(maxPrice))

    query = query
      .order(sortColumn, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Store products error:', error.message, error.details)
      // If orders_count column doesn't exist, retry without it
      if (error.message?.includes('orders_count')) {
        const fallback = await supabaseAdmin
          .from('products')
          .select('id, name, slug, images, category, selling_price, compare_at_price, cost_price, margin_percent, supplier, stock_status, tags, is_published, created_at', { count: 'exact' })
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1)

        if (fallback.error) {
          return NextResponse.json({ error: fallback.error.message }, { status: 500 })
        }
        return NextResponse.json({ products: fallback.data, total: fallback.count, page, limit })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: data, total: count, page, limit })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch products'
    console.error('Store products exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
