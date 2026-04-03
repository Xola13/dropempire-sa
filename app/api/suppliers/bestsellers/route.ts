import { NextRequest, NextResponse } from 'next/server'
import { getBestsellers as getDHgateBestsellers, searchProducts as searchDHgate } from '@/lib/suppliers/dhgate-scraper'
import { searchProducts as searchAlibaba, getBestsellers as getAlibabaBestsellers } from '@/lib/suppliers/alibaba-scraper'
import { searchProducts as searchTakealot } from '@/lib/suppliers/takealot-scraper'
import { searchProducts as searchMakro } from '@/lib/suppliers/makro-scraper'
import { searchProducts as searchGame } from '@/lib/suppliers/game-scraper'
import { searchProducts as searchBidorbuy, getBestDeals as getBidorbuyDeals } from '@/lib/suppliers/bidorbuy-scraper'
import type { DHgateProduct } from '@/lib/suppliers/dhgate-scraper'
import type { AlibabaProduct } from '@/lib/suppliers/alibaba-scraper'

const USD_TO_ZAR = parseFloat(process.env.NEXT_PUBLIC_EXCHANGE_RATE_USD_ZAR || '18.5')

// SA retail markup multiplier suggestions by category
const MARKUP_BY_CATEGORY: Record<string, number> = {
  electronics: 2.2,
  beauty: 3.5,
  fashion: 4.0,
  homeware: 3.0,
  garden: 2.8,
  sports: 3.2,
  toys: 3.5,
  pet: 3.0,
  kitchen: 3.2,
  general: 2.8,
}

function getMarkup(category: string): number {
  const key = category.toLowerCase()
  for (const [cat, mult] of Object.entries(MARKUP_BY_CATEGORY)) {
    if (key.includes(cat)) return mult
  }
  return MARKUP_BY_CATEGORY.general
}

interface NormalizedProduct {
  id: string
  source: string
  name: string
  imageUrl: string
  url: string
  category: string
  costUSD: number
  costZAR: number
  minOrder: number
  suggestedPrice: number
  estimatedMargin: number
  soldCount: number
  rating: number
  supplierName?: string
  supplierCountry?: string
  isLocal: boolean
  deliveryLabel: string
}

// ---- International normalizers ----

function normalizeDHgate(p: DHgateProduct): NormalizedProduct {
  const costUSD = p.minPrice
  const costZAR = costUSD * USD_TO_ZAR
  const markup = getMarkup(p.category)
  const suggestedPrice = Math.ceil(costZAR * markup / 10) * 10
  // International: add R85 shipping to cost
  const estimatedMargin =
    suggestedPrice > 0
      ? Math.round(((suggestedPrice - costZAR - 85 - suggestedPrice * 0.035) / suggestedPrice) * 100)
      : 0

  return {
    id: p.id,
    source: 'dhgate',
    name: p.name,
    imageUrl: p.imageUrl,
    url: p.url,
    category: p.category,
    costUSD,
    costZAR: Math.round(costZAR * 100) / 100,
    minOrder: p.minOrder,
    suggestedPrice,
    estimatedMargin,
    soldCount: p.soldCount,
    rating: p.rating,
    supplierName: p.supplier,
    isLocal: false,
    deliveryLabel: '🌍 15-25 days',
  }
}

function normalizeAlibaba(p: AlibabaProduct): NormalizedProduct {
  const costUSD = p.minPrice
  const costZAR = costUSD * USD_TO_ZAR
  const markup = getMarkup(p.category)
  const suggestedPrice = Math.ceil(costZAR * markup / 10) * 10
  const estimatedMargin =
    suggestedPrice > 0
      ? Math.round(((suggestedPrice - costZAR - 85 - suggestedPrice * 0.035) / suggestedPrice) * 100)
      : 0

  return {
    id: p.id,
    source: 'alibaba',
    name: p.name,
    imageUrl: p.imageUrl,
    url: p.url,
    category: p.category,
    costUSD,
    costZAR: Math.round(costZAR * 100) / 100,
    minOrder: p.minOrder,
    suggestedPrice,
    estimatedMargin,
    soldCount: 0,
    rating: p.rating,
    supplierName: p.supplierName,
    supplierCountry: p.supplierCountry,
    isLocal: false,
    deliveryLabel: '🌍 15-25 days',
  }
}

// ---- Local SA normalizer ----

function normalizeLocalSA(
  p: {
    id: string
    name: string
    price: number
    originalPrice?: number | null
    imageUrl: string
    url: string
    category?: string
    inStock?: boolean
  },
  source: string
): NormalizedProduct {
  const costZAR = p.price
  // Local: supplierPrice / (1 - 0.35) rounded to nearest R10
  const suggestedPrice = Math.round(costZAR / (1 - 0.35) / 10) * 10
  // Local: no shipping cost
  const estimatedMargin =
    suggestedPrice > 0
      ? Math.round(((suggestedPrice - costZAR - suggestedPrice * 0.035) / suggestedPrice) * 100)
      : 0

  return {
    id: p.id,
    source,
    name: p.name,
    imageUrl: p.imageUrl,
    url: p.url,
    category: p.category || '',
    costUSD: 0,
    costZAR,
    minOrder: 1,
    suggestedPrice,
    estimatedMargin,
    soldCount: 0,
    rating: 0,
    isLocal: true,
    deliveryLabel: '🇿🇦 1-3 days',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  // source=local → SA only; source=wholesale → international only; source=all → everything
  const source = searchParams.get('source') || 'all'

  try {
    const localResults: NormalizedProduct[] = []
    const intlResults: NormalizedProduct[] = []

    // ---- LOCAL SA sources ----
    if (source === 'local' || source === 'all') {
      const [takealotProducts, makroProducts, gameProducts, bidorbuyProducts] = await Promise.all([
        (q ? searchTakealot(q) : Promise.resolve([])).catch(() => []),
        (q ? searchMakro(q) : Promise.resolve([])).catch(() => []),
        (q ? searchGame(q) : Promise.resolve([])).catch(() => []),
        (q ? searchBidorbuy(q) : getBidorbuyDeals()).catch(() => []),
      ])

      localResults.push(
        ...takealotProducts.map(p => normalizeLocalSA(p, 'takealot')),
        ...makroProducts.map(p => normalizeLocalSA(p, 'makro')),
        ...gameProducts.map(p => normalizeLocalSA(p, 'game')),
        ...bidorbuyProducts.map(p => normalizeLocalSA(p, 'bidorbuy')),
      )

      // Sort local by margin descending
      localResults.sort((a, b) => b.estimatedMargin - a.estimatedMargin)
    }

    // ---- INTERNATIONAL sources ----
    if (source === 'wholesale' || source === 'all') {
      const [dhgateProducts, alibabaProducts] = await Promise.all([
        (q ? searchDHgate(q) : getDHgateBestsellers()).catch(() => []),
        (q ? searchAlibaba(q) : getAlibabaBestsellers()).catch(() => []),
      ])

      intlResults.push(
        ...dhgateProducts.map(normalizeDHgate),
        ...alibabaProducts.map(normalizeAlibaba),
      )

      intlResults.sort((a, b) => b.estimatedMargin - a.estimatedMargin)
    }

    // Local first, then international
    const combined = [...localResults, ...intlResults]

    return NextResponse.json({
      results: combined.slice(0, 40),
      exchangeRate: USD_TO_ZAR,
      count: combined.length,
    })
  } catch (err) {
    console.error('[suppliers/bestsellers] error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch wholesale products', results: [], exchangeRate: USD_TO_ZAR },
      { status: 500 }
    )
  }
}
