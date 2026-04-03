import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateMargin } from '@/lib/margin-calculator'
import * as aliexpress from '@/lib/suppliers/aliexpress'
import * as cj from '@/lib/suppliers/cj-dropshipping'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Single-product pricing optimisation (used by price-optimizer API route)
export async function pricingAgent(params: {
  productName: string
  costPrice: number
  currentPrice: number
  supplier: string
  category: string
  ordersCount: number
}): Promise<{
  recommendedPrice: number
  marginPercent: number
  reasoning: string
}> {
  const { productName, costPrice, currentPrice, supplier, category, ordersCount } = params

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system:
      'You are a pricing strategist for a South African dropshipping store. Enforce minimum 20% margin. Return ONLY valid JSON.',
    messages: [
      {
        role: 'user',
        content: `Optimise the price for this product:
Product: ${productName}
Category: ${category}
Supplier: ${supplier}
Cost price (ZAR): R${costPrice.toFixed(2)}
Current selling price: R${currentPrice.toFixed(2)}
Orders to date: ${ordersCount}

Return JSON: { "recommendedPrice": number, "marginPercent": number, "reasoning": "string" }
Rules:
- marginPercent must be >= 20
- Price should be psychologically appealing (e.g. R299, R499)
- Factor in competitive SA market pricing`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Fallback: just ensure 25% margin
    const targetMargin = 0.25
    const recommended = Math.ceil(costPrice / (1 - targetMargin) / 10) * 10
    const margin = ((recommended - costPrice) / recommended) * 100
    return { recommendedPrice: recommended, marginPercent: margin, reasoning: 'Fallback 25% margin calculation' }
  }

  const result = JSON.parse(jsonMatch[0]) as {
    recommendedPrice: number
    marginPercent: number
    reasoning: string
  }
  return result
}
const USD_TO_ZAR = 18.5

export async function runPricingAgent(): Promise<{
  updated: number
  unpublished: number
  flagged: number
}> {
  const start = Date.now()
  let updated = 0,
    unpublished = 0,
    flagged = 0

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_published', true)

  if (!products) return { updated: 0, unpublished: 0, flagged: 0 }

  for (const product of products) {
    try {
      let currentCostUSD = 0

      if (product.supplier === 'aliexpress') {
        const details = await aliexpress.getProductDetails(
          product.supplier_product_id
        )
        const skuPrice =
          details?.aliexpress_ds_product_get_response?.result
            ?.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0]?.sku_price
        currentCostUSD = parseFloat(skuPrice || '0')
      } else if (product.supplier === 'cj') {
        const details = await cj.getProductDetails(
          product.supplier_product_id
        )
        currentCostUSD = parseFloat(details?.data?.sellPrice || '0')
      }

      if (currentCostUSD === 0) continue
      const currentCostZAR = currentCostUSD * USD_TO_ZAR

      const shippingCost = product.supplier_shipping_days > 10 ? 85 : 65

      const { marginPercent } = calculateMargin(
        currentCostZAR,
        product.selling_price,
        shippingCost,
        3.5
      )

      if (marginPercent < 10) {
        await supabaseAdmin
          .from('products')
          .update({
            is_published: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)
        unpublished++
        flagged++
      } else if (marginPercent < 20) {
        const analysis = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: 'You are a pricing advisor for a SA dropshipping store. Return ONLY JSON.',
          messages: [
            {
              role: 'user',
              content: `Product: ${product.name}
Current selling price: R${product.selling_price}
New cost: R${currentCostZAR.toFixed(2)}
Current margin: ${marginPercent.toFixed(1)}%
Recommend: { "newPrice": number, "reasoning": "string" }`,
            },
          ],
        })
        const text =
          analysis.content[0].type === 'text'
            ? analysis.content[0].text
            : '{}'
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const { newPrice } = JSON.parse(jsonMatch[0])
          if (newPrice && newPrice !== product.selling_price) {
            const newShippingCost = product.supplier_shipping_days > 10 ? 85 : 65
            await supabaseAdmin
              .from('products')
              .update({
                selling_price: newPrice,
                cost_price: currentCostZAR,
                margin_percent: calculateMargin(
                  currentCostZAR,
                  newPrice,
                  newShippingCost,
                  3.5
                ).marginPercent,
                updated_at: new Date().toISOString(),
              })
              .eq('id', product.id)
            updated++
          }
        }
      } else {
        await supabaseAdmin
          .from('products')
          .update({
            cost_price: currentCostZAR,
            margin_percent: marginPercent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)
      }
    } catch (e) {
      console.error(`Pricing check error for ${product.id}:`, e)
    }
  }

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'pricing',
    action: 'daily_price_sync',
    input: { productCount: products.length },
    output: { updated, unpublished, flagged },
    reasoning: `Synced ${products.length} products: ${updated} updated, ${unpublished} unpublished`,
    success: true,
    duration_ms: Date.now() - start,
  })

  return { updated, unpublished, flagged }
}
