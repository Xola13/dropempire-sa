import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface TrendingProduct {
  name: string
  category: string
  demandScore: number
  reasoningNote: string
  estimatedMargin: string
  targetAudience: string
  keywords: string[]
}

export async function runTrendScoutAgent(): Promise<TrendingProduct[]> {
  const start = Date.now()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a South African e-commerce trend analyst specialising in dropshipping.
Your job is to identify the top 20 trending product opportunities for a South African dropshipping store right now.
Consider: seasonal trends in SA, popular categories on Takealot, SA social media trends, global product trends landing in SA.
Focus on products that: have 25-40% achievable margins, are lightweight (easy shipping),
are not heavily regulated, and have proven demand in SA.
Return ONLY valid JSON.`,
    messages: [
      {
        role: 'user',
        content: `Identify the top 20 trending dropshipping product opportunities for South Africa right now (${new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}).

For each product return:
{
  "name": "product name",
  "category": "category",
  "demandScore": 0-100,
  "reasoningNote": "why this is trending in SA",
  "estimatedMargin": "25-35%",
  "targetAudience": "who buys this",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Return as JSON array of 20 items. Consider: back-to-school season, SA climate, load-shedding products, wellness trends, home office products, beauty/skincare, pet products, kitchen gadgets.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array found in response')

  const products: TrendingProduct[] = JSON.parse(jsonMatch[0])

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'trend-scout',
    action: 'trend_analysis',
    input: { timestamp: new Date().toISOString() },
    output: { products_found: products.length },
    reasoning: content.text.substring(0, 500),
    success: true,
    duration_ms: Date.now() - start,
  })

  return products
}
