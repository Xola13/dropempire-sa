import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import * as aliexpress from '@/lib/suppliers/aliexpress'
import * as cj from '@/lib/suppliers/cj-dropshipping'
import { calculateMargin, recommendSellingPrice } from '@/lib/margin-calculator'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface SourcingResult {
  bestSupplier: 'aliexpress' | 'cj' | 'makro'
  score: number
  reasoning: string
  recommendedPrice: number
  costPrice: number
  shippingCost: number
  marginPercent: number
  deliveryDays: string
  supplierProductId: string
  supplierProductUrl: string
  riskFlags: string[]
  allOptions: SupplierOption[]
}

interface SupplierOption {
  supplier: string
  productId: string
  name: string
  costUSD: number
  costZAR: number
  shippingCostZAR: number
  totalCostZAR: number
  deliveryDays: string
  rating: number
  recommendedSellingPrice: number
  marginPercent: number
  productUrl: string
}

const USD_TO_ZAR = 18.5

export async function runSourcingAgent(
  keyword: string
): Promise<SourcingResult> {
  const start = Date.now()
  const options: SupplierOption[] = []

  // Search AliExpress
  try {
    const aliResults = await aliexpress.searchProducts(keyword)
    const aliProducts =
      aliResults?.aliexpress_ds_product_search_response?.result?.products
        ?.product || []
    for (const p of aliProducts.slice(0, 5)) {
      const costUSD = parseFloat(
        p.target_sale_price || p.sale_price || '0'
      )
      const costZAR = costUSD * USD_TO_ZAR
      const shippingZAR = 85
      const totalCost = costZAR + shippingZAR
      const sellingPrice = recommendSellingPrice(costZAR, shippingZAR)
      const { marginPercent } = calculateMargin(
        costZAR,
        sellingPrice,
        shippingZAR,
        3.5
      )
      options.push({
        supplier: 'aliexpress',
        productId: p.product_id,
        name: p.product_title,
        costUSD,
        costZAR: Math.round(costZAR * 100) / 100,
        shippingCostZAR: shippingZAR,
        totalCostZAR: Math.round(totalCost * 100) / 100,
        deliveryDays: '15-25 business days',
        rating: parseFloat(p.evaluate_rate || '0'),
        recommendedSellingPrice: sellingPrice,
        marginPercent: Math.round(marginPercent * 10) / 10,
        productUrl: `https://www.aliexpress.com/item/${p.product_id}.html`,
      })
    }
  } catch (e) {
    console.error('AliExpress search error:', e)
  }

  // Search CJ Dropshipping
  try {
    const cjResults = await cj.searchProducts(keyword)
    const cjProducts = cjResults?.data?.list || []
    for (const p of cjProducts.slice(0, 5)) {
      const costZAR = parseFloat(p.sellPrice || '0') * USD_TO_ZAR
      const shippingZAR = 65
      const sellingPrice = recommendSellingPrice(costZAR, shippingZAR)
      const { marginPercent } = calculateMargin(
        costZAR,
        sellingPrice,
        shippingZAR,
        3.5
      )
      options.push({
        supplier: 'cj',
        productId: p.pid,
        name: p.productNameEn,
        costUSD: parseFloat(p.sellPrice || '0'),
        costZAR: Math.round(costZAR * 100) / 100,
        shippingCostZAR: shippingZAR,
        totalCostZAR: Math.round((costZAR + shippingZAR) * 100) / 100,
        deliveryDays: '7-15 business days',
        rating: 4.2,
        recommendedSellingPrice: sellingPrice,
        marginPercent: Math.round(marginPercent * 10) / 10,
        productUrl: `https://cjdropshipping.com/product/${p.pid}.html`,
      })
    }
  } catch (e) {
    console.error('CJ search error:', e)
  }

  if (options.length === 0) {
    throw new Error('No products found from any supplier')
  }

  // Ask Claude to score and select best option
  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are a SA dropshipping product analyst. Score each supplier option 0-100 based on:
- Profit margin (40% weight): higher margin = higher score
- Delivery speed to SA (30% weight): faster = higher score
- Supplier reliability (20% weight): CJ > AliExpress for reliability, higher rating = higher score
- Product quality indicators (10% weight): rating, reviews

Return ONLY valid JSON with this structure:
{
  "bestSupplier": "aliexpress|cj|makro",
  "bestProductId": "id",
  "score": 0-100,
  "reasoning": "clear explanation",
  "recommendedPrice": 000,
  "riskFlags": ["flag1", "flag2"]
}`,
    messages: [
      {
        role: 'user',
        content: `Analyse these supplier options for "${keyword}" and select the best one:

${JSON.stringify(options, null, 2)}

Pick the option that maximises profit margin while maintaining acceptable delivery speed to South Africa.`,
      },
    ],
  })

  const content = analysis.content[0]
  if (content.type !== 'text') throw new Error('Bad AI response')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in AI response')
  const aiDecision = JSON.parse(jsonMatch[0])

  const bestOption =
    options.find(o => o.productId === aiDecision.bestProductId) ||
    options[0]

  const result: SourcingResult = {
    bestSupplier: aiDecision.bestSupplier as 'aliexpress' | 'cj' | 'makro',
    score: aiDecision.score,
    reasoning: aiDecision.reasoning,
    recommendedPrice:
      aiDecision.recommendedPrice || bestOption.recommendedSellingPrice,
    costPrice: bestOption.costZAR,
    shippingCost: bestOption.shippingCostZAR,
    marginPercent: bestOption.marginPercent,
    deliveryDays: bestOption.deliveryDays,
    supplierProductId: bestOption.productId,
    supplierProductUrl: bestOption.productUrl,
    riskFlags: aiDecision.riskFlags || [],
    allOptions: options,
  }

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'sourcing',
    action: 'product_sourcing',
    input: { keyword, optionsCount: options.length },
    output: result,
    reasoning: aiDecision.reasoning,
    success: true,
    duration_ms: Date.now() - start,
  })

  return result
}
