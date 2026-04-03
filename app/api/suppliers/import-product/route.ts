import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runListingAgent } from '@/lib/agents/listing-agent'
import { recommendSellingPrice } from '@/lib/margin-calculator'

export async function POST(req: NextRequest) {
  try {
    const {
      supplier,
      productId,
      costZAR,
      shippingCostZAR,
      category,
      imageUrls,
      supplierName,
      supplierDescription,
    } = await req.json()

    if (!supplier || !productId || !costZAR || !supplierName) {
      return NextResponse.json(
        { error: 'supplier, productId, costZAR, and supplierName are required' },
        { status: 400 }
      )
    }

    const sellingPrice = recommendSellingPrice(costZAR, shippingCostZAR || 0)
    const deliveryDays =
      supplier === 'cj'
        ? '7-15 business days'
        : supplier === 'makro'
          ? '2-4 business days'
          : '15-25 business days'

    const listing = await runListingAgent({
      name: supplierName,
      supplierDescription,
      category,
      price: sellingPrice,
      deliveryDays,
      supplier,
    })

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        slug: listing.slug,
        name: listing.title,
        description: listing.description,
        ai_description: listing.description,
        images: imageUrls || [],
        category: listing.category,
        tags: listing.tags,
        selling_price: sellingPrice,
        compare_at_price: listing.compareAtPrice,
        cost_price: costZAR,
        margin_percent:
          ((sellingPrice - costZAR - (shippingCostZAR || 0)) / sellingPrice) *
          100,
        supplier,
        supplier_product_id: productId,
        supplier_shipping_days: parseInt(deliveryDays.split('-')[0]),
        stock_status: 'in_stock',
        is_published: false,
        bullet_points: listing.bulletPoints,
        faqs: listing.faqs,
        seo_title: listing.seoTitle,
        seo_description: listing.seoDescription,
      })
      .select('id, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product, listing })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
