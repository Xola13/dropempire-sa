import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { requireAdmin } from '@/lib/security/guards'
import { z } from 'zod'
import { parseBody, serverError } from '@/lib/http'

const httpsUrl = z.string().url().max(2000).refine(u => u.startsWith('https://'))

const ImportSchema = z.object({
  name: z.string().trim().min(2).max(300),
  description: z.string().max(10_000).optional(),
  // Scraped data is messy: drop bad image URLs instead of rejecting the import.
  images: z
    .array(z.string())
    .max(30)
    .optional()
    .transform(list => (list ?? []).filter(u => httpsUrl.safeParse(u).success).slice(0, 10)),
  category: z.string().trim().max(100).optional(),
  sellingPrice: z.number().positive().max(1_000_000),
  supplierPrice: z.number().positive().max(1_000_000),
  supplier: z.enum(['aliexpress', 'cj', 'makro', 'takealot', 'game', 'bidorbuy', 'hivve', 'gumtree', 'manual']),
  supplierProductId: z.string().max(200).optional(),
  supplierProductUrl: httpsUrl.optional().or(z.literal('')),
  deliveryDays: z.string().max(50).optional(),
})

// Import a product manually — zero AI needed
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const parsed = await parseBody(req, ImportSchema)
    if (!parsed.ok) return parsed.response
    const {
      name,
      description,
      images,
      category,
      sellingPrice,
      supplierPrice,
      supplier,
      supplierProductId,
      supplierProductUrl,
      deliveryDays,
    } = parsed.data

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
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

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
      throw error
    }

    return NextResponse.json({
      success: true,
      product,
      margin: `${marginPercent.toFixed(1)}%`,
      message: `Product imported! Margin: ${marginPercent.toFixed(1)}%. Go to Products to publish it.`,
    })
  } catch (e) {
    return serverError('suppliers/manual-import', e)
  }
}
