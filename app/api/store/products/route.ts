import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PUBLIC_PRODUCT_LIST_COLUMNS } from '@/lib/products/public'
import { intParam, limitByIp, serverError } from '@/lib/http'

// Escape LIKE wildcards so user input is matched literally (and can't force
// expensive `%%%%` patterns).
const likeEscape = (s: string) => s.replace(/[\\%_]/g, c => `\\${c}`)

function priceParam(value: string | null): number | null {
  if (!value) return null
  const n = Number.parseFloat(value)
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null
}

export async function GET(req: NextRequest) {
  try {
    const limited = await limitByIp(req, 'store-products', 120, 60)
    if (limited) return limited

    const sp = req.nextUrl.searchParams
    const page = intParam(sp.get('page'), 1, 1, 500)
    const limit = intParam(sp.get('limit'), 20, 1, 50)
    const category = (sp.get('category') || '').trim().slice(0, 100)
    const search = (sp.get('search') || '').trim().slice(0, 100)
    const sort = sp.get('sort')
    const ascending = sp.get('order') === 'asc'
    const minPrice = priceParam(sp.get('minPrice'))
    const maxPrice = priceParam(sp.get('maxPrice'))

    // Only known columns can be sorted on.
    const sortColumn =
      sort === 'price' ? 'selling_price' : sort === 'popular' ? 'orders_count' : 'created_at'

    let query = supabaseAdmin
      .from('products')
      .select(PUBLIC_PRODUCT_LIST_COLUMNS, { count: 'estimated' })
      .eq('is_published', true)

    if (search) query = query.ilike('name', `%${likeEscape(search)}%`)
    if (category) query = query.ilike('category', `%${likeEscape(category)}%`)
    if (minPrice !== null) query = query.gte('selling_price', minPrice)
    if (maxPrice !== null) query = query.lte('selling_price', maxPrice)

    const { data, error, count } = await query
      .order(sortColumn, { ascending })
      .order('id') // stable pagination when sort keys tie
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json(
      { products: data, total: count, page, limit },
      {
        // Public catalogue data: let the CDN absorb traffic.
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      }
    )
  } catch (e) {
    return serverError('store/products', e)
  }
}
