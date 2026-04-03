import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: listings, error } = await supabase
      .from('marketplace_listings')
      .select(
        `
        *,
        products (
          name,
          images,
          category
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ listings: listings || [] })
  } catch (err) {
    console.error('[admin/marketplace/listings GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
