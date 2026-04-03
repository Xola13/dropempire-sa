import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

// Import a product manually — zero AI needed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      description,
      images,
      category,
      sellingPrice,
      supplierPrice,
      supplier,          // 'takealot' | 'makro' | 'cj' | 'aliexpress'
      supplierProductId,
      supplierProductUrl,
      deliveryDays,
    } = body

    if (!name || !sellingPrice || !supplierPrice || !supplier) {
      return NextResponse.json({ error: 'name, sellingPrice, supplierPrice, supplier are required' }, { status: 400 })
    }

    const shippingCost = supplier === 'takealot' || supplier === 'makro' ? 0 : supplier === 'cj' ? 65 : 85
    const paymentFee = sellingPrice * 0.035
    const netMargin = sellingPrice - supplierPrice - shippingCost - paymentFee
    const marginPercent = (netMargin / sellingPrice) * 100

    if (marginPercent < 10) {
      return NextResponse.json({
        error: `Margin too low (${marginPercent.toFixed(1)}%). Increase selling price or choose a cheaper supplier.`,
      }, { status: 400 })
    }

    // Build a slug — handle duplicates by appending timestamp
    let slug = slugify(name)
    const { data: existing } = await supabaseAdmin.from('products').select('id').eq('slug', slug).maybeSingle()
    if (existing) slug = `${slug}-${Date.now()}`

    const deliveryDaysNum = parseInt((deliveryDays || '7').split('-')[0]) || 7

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        slug,
        name,
        description: description || `${name} — available for fast delivery in South Africa.`,
        images: images || [],
        category: category || 'General',
        tags: name.toLowerCase().split(' ').filter((w: string) => w.length > 2),
        selling_price: sellingPrice,
        compare_at_price: Math.ceil((sellingPrice * 1.15) / 10) * 10,
        cost_price: supplierPrice,
        margin_percent: Math.round(marginPercent * 10) / 10,
        supplier,
        supplier_product_id: supplierProductId || slug,
        supplier_product_url: supplierProductUrl || '',
        supplier_shipping_days: deliveryDaysNum,
        stock_status: 'in_stock',
        is_published: false,
        orders_count: 0,
      })
      .select('id, slug, name, selling_price, margin_percent')
      .single()

    if (error) {
      console.error('Import error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product,
      margin: `${marginPercent.toFixed(1)}%`,
      message: `Product imported! Margin: ${marginPercent.toFixed(1)}%. Go to Products to publish it.`,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
