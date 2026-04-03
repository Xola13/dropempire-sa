import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { searchProducts as searchAliExpress } from '@/lib/suppliers/aliexpress'
import { searchProducts as searchCJDropshipping } from '@/lib/suppliers/cj-dropshipping'
import { calculateMargin } from '@/lib/margin-calculator'

export async function POST() {
  let synced = 0
  let failed = 0
  let marginViolations = 0

  try {
    // Get all published products with supplier IDs
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, supplier, supplier_product_id, cost_price, selling_price, margin_percent')
      .eq('is_published', true)
      .limit(100)

    if (error) throw error

    for (const product of (products || [])) {
      try {
        let newCost: number | null = null

        if (product.supplier === 'aliexpress') {
          // Try to get fresh price from AliExpress
          try {
            const results = await searchAliExpress(product.name)
            if (Array.isArray(results) && results.length > 0) {
              const match = (results as Array<Record<string, unknown>>).find(r => r.id === product.supplier_product_id) || results[0] as Record<string, unknown>
              newCost = (match.priceZAR ?? match.price ?? null) as number | null
            }
          } catch {
            // AliExpress search may fail; skip
          }
        } else if (product.supplier === 'cj') {
          try {
            const results = await searchCJDropshipping(product.name)
            if (Array.isArray(results) && results.length > 0) {
              const match = (results as Array<Record<string, unknown>>).find(r => r.id === product.supplier_product_id) || results[0] as Record<string, unknown>
              newCost = (match.priceZAR ?? match.price ?? null) as number | null
            }
          } catch {
            // CJ search may fail; skip
          }
        }

        if (newCost !== null && newCost !== product.cost_price) {
          const newMargin = calculateMargin(newCost, product.selling_price)

          if (newMargin.marginPercent < 20) {
            // Cost increased so much that margin is violated — mark for review
            marginViolations++
            await supabaseAdmin
              .from('products')
              .update({
                cost_price: newCost,
                margin_percent: newMargin.marginPercent,
                stock_status: 'low_stock', // Flag for attention
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id)
          } else {
            await supabaseAdmin
              .from('products')
              .update({
                cost_price: newCost,
                margin_percent: newMargin.marginPercent,
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id)
          }

          synced++
        }
      } catch {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} products, ${failed} failed, ${marginViolations} margin violations`,
      synced,
      failed,
      marginViolations,
    })
  } catch (err) {
    console.error('Sync prices error:', err)
    return NextResponse.json(
      { error: 'Price sync failed' },
      { status: 500 }
    )
  }
}
