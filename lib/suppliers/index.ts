import { searchProducts as searchTakealot } from './takealot-scraper'
import { searchProducts as searchMakro } from './makro-scraper'
import { searchProducts as searchGame } from './game-scraper'
import { searchProducts as searchBidorbuy } from './bidorbuy-scraper'
import { searchProducts as searchDHgate, getBestsellers as getDHgateBestsellers } from './dhgate-scraper'
import { searchProducts as searchAlibaba, getBestsellers as getAlibabaBestsellers } from './alibaba-scraper'

export type SupplierSource =
  | 'takealot'
  | 'makro'
  | 'game'
  | 'bidorbuy'
  | 'gumtree'
  | 'dhgate'
  | 'alibaba'
  | 'cj'

export interface UnifiedProduct {
  id: string
  name: string
  supplierPrice: number
  originalPrice: number | null
  image: string
  url: string
  supplier: SupplierSource
  isLocal: boolean
  deliveryDays: string
  deliveryLabel: string
  minOrder: number
  inStock: boolean
  suggestedSellingPrice: number
  estimatedMargin: number
  category: string
}

export function calculateSuggestedPrice(supplierPrice: number, isLocal: boolean): number {
  if (isLocal) {
    // Local: supplierPrice / (1 - 0.35) rounded to nearest R10
    const raw = supplierPrice / (1 - 0.35)
    return Math.round(raw / 10) * 10
  } else {
    // International: (supplierPrice + R85 shipping) / (1 - 0.35) rounded to nearest R10
    const raw = (supplierPrice + 85) / (1 - 0.35)
    return Math.round(raw / 10) * 10
  }
}

export function calculateMargin(
  supplierPrice: number,
  sellingPrice: number,
  isLocal: boolean
): number {
  if (sellingPrice <= 0) return 0
  const platformFee = sellingPrice * 0.035
  if (isLocal) {
    // Local: no shipping cost
    return ((sellingPrice - supplierPrice - platformFee) / sellingPrice) * 100
  } else {
    // International: add R85 shipping to cost
    return ((sellingPrice - supplierPrice - 85 - platformFee) / sellingPrice) * 100
  }
}

function toUnified(
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
  supplier: SupplierSource,
  isLocal: boolean
): UnifiedProduct {
  const suggestedSellingPrice = calculateSuggestedPrice(p.price, isLocal)
  const estimatedMargin = calculateMargin(p.price, suggestedSellingPrice, isLocal)
  const deliveryDays = isLocal ? '1-3 business days' : '15-25 business days'
  const deliveryLabel = isLocal ? '🇿🇦 1-3 days' : '🌍 15-25 days'

  return {
    id: p.id,
    name: p.name,
    supplierPrice: p.price,
    originalPrice: p.originalPrice ?? null,
    image: p.imageUrl,
    url: p.url,
    supplier,
    isLocal,
    deliveryDays,
    deliveryLabel,
    minOrder: 1,
    inStock: p.inStock !== false,
    suggestedSellingPrice,
    estimatedMargin: Math.round(estimatedMargin * 10) / 10,
    category: p.category || '',
  }
}

export async function searchAllLocalSuppliers(keyword: string): Promise<UnifiedProduct[]> {
  try {
    const [takealotResults, makroResults, gameResults, bidorbuyResults] = await Promise.all([
      searchTakealot(keyword).catch(() => []),
      searchMakro(keyword).catch(() => []),
      searchGame(keyword).catch(() => []),
      searchBidorbuy(keyword).catch(() => []),
    ])

    const unified: UnifiedProduct[] = [
      ...takealotResults.map(p => toUnified(p, 'takealot', true)),
      ...makroResults.map(p => toUnified(p, 'makro', true)),
      ...gameResults.map(p => toUnified(p, 'game', true)),
      ...bidorbuyResults.map(p => toUnified(p, 'bidorbuy', true)),
    ]

    // Sort by estimated margin descending
    return unified.sort((a, b) => b.estimatedMargin - a.estimatedMargin).slice(0, 40)
  } catch (e) {
    console.error('searchAllLocalSuppliers error:', e)
    return []
  }
}

export async function searchAllSuppliers(keyword: string): Promise<UnifiedProduct[]> {
  try {
    const [localResults, dhgateResults, alibabaResults] = await Promise.all([
      searchAllLocalSuppliers(keyword).catch(() => []),
      searchDHgate(keyword).catch(() => []),
      searchAlibaba(keyword).catch(() => []),
    ])

    const USD_TO_ZAR = parseFloat(process.env.NEXT_PUBLIC_EXCHANGE_RATE_USD_ZAR || '18.5')

    const intlUnified: UnifiedProduct[] = [
      ...dhgateResults.map(p =>
        toUnified(
          { ...p, price: p.minPrice * USD_TO_ZAR, imageUrl: p.imageUrl },
          'dhgate',
          false
        )
      ),
      ...alibabaResults.map(p =>
        toUnified(
          { ...p, price: p.minPrice * USD_TO_ZAR, imageUrl: p.imageUrl },
          'alibaba',
          false
        )
      ),
    ]

    // Local first, then international
    return [...localResults, ...intlUnified]
  } catch (e) {
    console.error('searchAllSuppliers error:', e)
    return []
  }
}
