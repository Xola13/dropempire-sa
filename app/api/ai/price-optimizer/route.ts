import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { pricingAgent } from '@/lib/agents/pricing-agent'
import { logAgentAction } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const { productId } = await req.json()

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Fetch product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Run pricing agent
    const result = await pricingAgent({
      productName: product.name,
      costPrice: product.cost_price,
      currentPrice: product.selling_price,
      supplier: product.supplier,
      category: product.category,
      ordersCount: product.orders_count,
    })

    // Apply new price if margin is satisfied
    if (result.recommendedPrice && result.marginPercent >= 20) {
      await supabaseAdmin
        .from('products')
        .update({
          selling_price: result.recommendedPrice,
          margin_percent: result.marginPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
    }

    await logAgentAction({
      agent: 'pricing-agent',
      action: 'optimize_price',
      input: { productId, currentPrice: product.selling_price, costPrice: product.cost_price },
      output: result,
      reasoning: result.reasoning,
      success: true,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({
      product: { id: productId, name: product.name },
      previousPrice: product.selling_price,
      newPrice: result.recommendedPrice,
      marginPercent: result.marginPercent,
      reasoning: result.reasoning,
      applied: result.marginPercent >= 20,
    })
  } catch (err) {
    console.error('Price optimizer error:', err)
    await logAgentAction({
      agent: 'pricing-agent',
      action: 'optimize_price',
      input: {},
      output: null,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      duration_ms: Date.now() - start,
    })
    return NextResponse.json(
      { error: 'Price optimization failed' },
      { status: 500 }
    )
  }
}

// Batch optimize all products
export async function GET() {
  const start = Date.now()
  let optimized = 0

  try {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, cost_price, selling_price, supplier, category, orders_count')
      .eq('is_published', true)
      .limit(50)

    for (const product of (products || [])) {
      try {
        const result = await pricingAgent({
          productName: product.name,
          costPrice: product.cost_price,
          currentPrice: product.selling_price,
          supplier: product.supplier,
          category: product.category,
          ordersCount: product.orders_count,
        })

        if (result.recommendedPrice && result.marginPercent >= 20 &&
          Math.abs(result.recommendedPrice - product.selling_price) > 1) {
          await supabaseAdmin
            .from('products')
            .update({
              selling_price: result.recommendedPrice,
              margin_percent: result.marginPercent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)

          optimized++
        }
      } catch {
        // Continue with other products
      }
    }

    await logAgentAction({
      agent: 'pricing-agent',
      action: 'batch_optimize',
      input: { productCount: products?.length || 0 },
      output: { optimized },
      success: true,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({
      message: `Price optimization complete`,
      totalProducts: products?.length || 0,
      optimized,
    })
  } catch (err) {
    console.error('Batch price optimizer error:', err)
    return NextResponse.json(
      { error: 'Batch optimization failed' },
      { status: 500 }
    )
  }
}
