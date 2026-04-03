import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

// POST — import a wholesale opportunity (DHgate/Alibaba product) into the products table
// This is a lightweight import that doesn't call the full AI listing agent
// (to keep it fast enough for the marketplace UI)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      source,
      name,
      imageUrl,
      supplierUrl,
      costUSD,
      costZAR,
      suggestedPrice,
      category,
      minOrder,
    } = body

    if (!name || !costZAR || !suggestedPrice) {
      return NextResponse.json(
        { error: 'name, costZAR, and suggestedPrice are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Generate a unique slug
    const baseSlug = slugify(name).slice(0, 60)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const marginPercent =
      suggestedPrice > 0
        ? Math.round(((suggestedPrice - costZAR) / suggestedPrice) * 100)
        : 0

    // Map source to nearest existing supplier value
    // 'dhgate' and 'alibaba' are wholesale; we store as 'aliexpress' for now
    // (supplier column is constrained to existing values)
    const supplierValue = 'aliexpress' as const

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        slug,
        name: name.trim(),
        description: `Wholesale import from ${source === 'dhgate' ? 'DHgate' : 'Alibaba'}. ${name.trim()}`,
        ai_description: null,
        images: imageUrl ? [imageUrl] : [],
        category: category || 'General',
        tags: [source === 'dhgate' ? 'DHgate' : 'Alibaba', 'Wholesale'],
        selling_price: suggestedPrice,
        compare_at_price: Math.round(suggestedPrice * 1.25),
        cost_price: costZAR,
        margin_percent: marginPercent,
        supplier: supplierValue,
        supplier_product_id: `${source}-${Date.now()}`,
        supplier_product_url: supplierUrl || null,
        supplier_shipping_days: source === 'dhgate' ? 14 : 21,
        stock_status: 'in_stock',
        is_published: false,
        bullet_points: [],
        faqs: [],
      })
      .select('id, slug, name')
      .single()

    if (error) {
      // Check if it's a duplicate slug
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('products')
          .select('id, slug, name')
          .eq('slug', slug)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({ productId: existing.id, product: existing, existing: true })
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Save to wholesale_opportunities table for tracking (non-fatal)
    try {
      await supabase.from('wholesale_opportunities').insert({
        source,
        name: name.trim(),
        image_url: imageUrl || null,
        supplier_url: supplierUrl || null,
        cost_usd: costUSD || null,
        cost_zar: costZAR,
        min_order: minOrder || 1,
        suggested_price: suggestedPrice,
        estimated_margin: marginPercent,
        category: category || 'General',
        status: 'imported',
      })
    } catch {
      // non-fatal
    }

    return NextResponse.json({ productId: product.id, product }, { status: 201 })
  } catch (err) {
    console.error('[wholesale-import] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
