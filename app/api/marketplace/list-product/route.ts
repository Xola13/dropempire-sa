import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createListing as takealotCreateListing } from '@/lib/marketplace/takealot-seller'
import { createListing as makroCreateListing } from '@/lib/marketplace/makro-seller'
import { slugify } from '@/lib/utils'

interface ListProductBody {
  productId: string
  marketplace: 'takealot' | 'makro'
  sellingPrice: number
  stock: number
  rrp?: number
}

export async function POST(req: NextRequest) {
  try {
    const body: ListProductBody = await req.json()
    const { productId, marketplace, sellingPrice, stock, rrp } = body

    if (!productId || !marketplace || !sellingPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, marketplace, sellingPrice' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch product from DB
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 2. Generate a marketplace SKU
    const sku = `DE-${slugify(product.name).substring(0, 20).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    let listingResult: { success: boolean; listingId?: string; listingUrl?: string; error?: string }

    // 3. List on chosen marketplace
    if (marketplace === 'takealot') {
      listingResult = await takealotCreateListing({
        title: product.seo_title || product.name,
        description: product.ai_description || product.description || product.name,
        sellingPrice,
        rrp: rrp || Math.round(sellingPrice * 1.2),
        images: product.images || [],
        category: product.category,
        sku,
        stock: stock || 10,
      })
    } else if (marketplace === 'makro') {
      listingResult = await makroCreateListing({
        title: product.seo_title || product.name,
        description: product.ai_description || product.description || product.name,
        price: sellingPrice,
        images: product.images || [],
        category: product.category,
        sku,
      })
    } else {
      return NextResponse.json({ error: 'Invalid marketplace' }, { status: 400 })
    }

    if (!listingResult.success) {
      return NextResponse.json(
        {
          error: listingResult.error || 'Failed to create listing',
          needsSetup: listingResult.error?.includes('not configured'),
        },
        { status: 422 }
      )
    }

    // 4. Save marketplace_listing record to DB
    const { data: listing, error: dbError } = await supabase
      .from('marketplace_listings')
      .insert({
        product_id: productId,
        marketplace,
        marketplace_sku: sku,
        marketplace_listing_id: listingResult.listingId,
        marketplace_url: listingResult.listingUrl,
        selling_price: sellingPrice,
        stock_quantity: stock || 10,
        status: 'pending',
        marketplace_fee_percent: marketplace === 'takealot' ? 15 : 12,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[list-product] DB error saving listing:', dbError)
      // Still return success since listing was created on marketplace
    }

    return NextResponse.json({
      success: true,
      listing: listing || null,
      listingUrl: listingResult.listingUrl,
      sku,
      message: `Product successfully listed on ${marketplace === 'takealot' ? 'Takealot' : 'Makro'}`,
    })
  } catch (err) {
    console.error('[list-product] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
