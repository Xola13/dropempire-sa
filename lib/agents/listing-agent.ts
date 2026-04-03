import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ListingDraft {
  title: string
  slug: string
  description: string
  bulletPoints: string[]
  faqs: Array<{ question: string; answer: string }>
  tags: string[]
  category: string
  compareAtPrice: number
  seoTitle: string
  seoDescription: string
}

export async function runListingAgent(productData: {
  name: string
  supplierDescription?: string
  category?: string
  price: number
  deliveryDays: string
  supplier: string
}): Promise<ListingDraft> {
  const start = Date.now()

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a South African e-commerce copywriter specialising in high-converting product listings for dropshipping stores.
Write compelling, honest copy that resonates with South African shoppers.
Use South African English (not American English).
Avoid making false claims. Highlight value and benefits clearly.
Return ONLY valid JSON.`,
    messages: [
      {
        role: 'user',
        content: `Create a complete product listing for this product:

Product name: ${productData.name}
Original description: ${productData.supplierDescription || 'N/A'}
Category: ${productData.category || 'General'}
Selling price: R${productData.price}
Delivery: ${productData.deliveryDays}
Supplier: ${productData.supplier}

Generate the following as JSON:
{
  "title": "SEO-optimised product title (max 70 chars)",
  "description": "Compelling 300-500 word product description in South African English, highlighting benefits",
  "bulletPoints": ["5 key feature/benefit bullet points"],
  "faqs": [
    {"question": "...", "answer": "..."},
    (3-5 FAQs addressing common SA shopper concerns like delivery time, returns, quality)
  ],
  "tags": ["10-15 search tags"],
  "category": "Best category for this product",
  "compareAtPrice": suggested_compare_at_price_number (10-20% above selling price for urgency),
  "seoTitle": "SEO meta title (60 chars)",
  "seoDescription": "SEO meta description (155 chars)"
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Bad AI response')

  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  const draft = JSON.parse(jsonMatch[0])

  const result: ListingDraft = {
    ...draft,
    slug: slugify(draft.title || productData.name),
  }

  await supabaseAdmin.from('agent_logs').insert({
    agent: 'listing',
    action: 'generate_listing',
    input: productData,
    output: { title: result.title, slug: result.slug },
    reasoning: 'Listing generated successfully',
    success: true,
    duration_ms: Date.now() - start,
  })

  return result
}
