import { NextRequest, NextResponse } from 'next/server'
import * as takealot from '@/lib/suppliers/takealot-scraper'
import * as makro from '@/lib/suppliers/makro-scraper'
import * as game from '@/lib/suppliers/game-scraper'
import * as bidorbuy from '@/lib/suppliers/bidorbuy-scraper'
import * as hivve from '@/lib/suppliers/hivve-scraper'
import { calculateSuggestedPrice, calculateMargin } from '@/lib/suppliers/index'

interface CompareProduct {
  id: string
  name: string
  price: number
  image: string
  url: string
  supplier: string
  supplierLabel: string
  flag: string
  deliveryDays: string
  suggestedSellingPrice: number
  estimatedMargin: number
  inStock: boolean
}

function mapToCompare(
  products: Array<{
    id: string
    name: string
    price: number
    imageUrl?: string
    url: string
    inStock?: boolean
  }>,
  supplier: string,
  label: string,
  flag: string,
  delivery: string
): CompareProduct[] {
  return products
    .filter(p => p.price > 0 && p.name?.length > 2)
    .slice(0, 8)
    .map(p => {
      const suggested = calculateSuggestedPrice(p.price, true)
      return {
        id: `${supplier}-${p.id}`,
        name: p.name,
        price: p.price,
        image: p.imageUrl || '',
        url: p.url,
        supplier,
        supplierLabel: label,
        flag,
        deliveryDays: delivery,
        suggestedSellingPrice: suggested,
        estimatedMargin: Math.round(calculateMargin(p.price, suggested, true)),
        inStock: p.inStock !== false,
      }
    })
}

// Wrap with a timeout so slow/failed scrapers don't block the response
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | []> {
  return Promise.race([
    promise,
    new Promise<[]>(resolve => setTimeout(() => resolve([]), ms)),
  ])
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || ''
  if (!query.trim()) return NextResponse.json({ error: 'q is required' }, { status: 400 })

  // Phase 1: fast fetch-based scrapers (no browser) — run in parallel
  const [takealotRes, makroRes, hivveRes] = await Promise.allSettled([
    withTimeout(takealot.searchProducts(query), 15000),
    withTimeout(makro.searchProducts(query), 20000),
    withTimeout(hivve.searchProducts(query), 10000),
  ])

  // Phase 2: Playwright-based scrapers — run in parallel but capped at 25s each
  // Run after phase 1 so they don't compete for resources with each other
  const [gameRes, bidorbuyRes] = await Promise.allSettled([
    withTimeout(game.searchProducts(query), 25000),
    withTimeout(bidorbuy.searchProducts(query), 25000),
  ])

  const takealotProducts = takealotRes.status === 'fulfilled' ? (takealotRes.value as typeof takealotRes.value) : []
  const makroProducts = makroRes.status === 'fulfilled' ? (makroRes.value as typeof makroRes.value) : []
  const hivveProducts = hivveRes.status === 'fulfilled' ? (hivveRes.value as typeof hivveRes.value) : []
  const gameProducts = gameRes.status === 'fulfilled' ? (gameRes.value as typeof gameRes.value) : []
  const bidorbuyProducts = bidorbuyRes.status === 'fulfilled' ? (bidorbuyRes.value as typeof bidorbuyRes.value) : []

  const allProducts: CompareProduct[] = [
    ...mapToCompare(takealotProducts as Parameters<typeof mapToCompare>[0], 'takealot', 'Takealot', '🇿🇦', '1-3 days'),
    ...mapToCompare(makroProducts as Parameters<typeof mapToCompare>[0], 'makro', 'Makro', '🇿🇦', '2-4 days'),
    ...mapToCompare(gameProducts as Parameters<typeof mapToCompare>[0], 'game', 'Game', '🇿🇦', '1-3 days'),
    ...mapToCompare(bidorbuyProducts as Parameters<typeof mapToCompare>[0], 'bidorbuy', 'BidOrBuy', '🇿🇦', '1-3 days'),
    ...mapToCompare(hivveProducts as Parameters<typeof mapToCompare>[0], 'hivve', 'Hivve', '🇿🇦', '2-5 days'),
  ]

  // Sort by price ascending
  allProducts.sort((a, b) => a.price - b.price)

  // Find best arbitrage: cheapest vs most expensive in-stock product
  const cheapest = allProducts.find(p => p.inStock) || null
  const mostExpensive = [...allProducts].reverse().find(p => p.inStock) || null

  let arbitrage = null
  if (
    cheapest &&
    mostExpensive &&
    cheapest.id !== mostExpensive.id &&
    cheapest.supplier !== mostExpensive.supplier &&
    mostExpensive.price > cheapest.price * 1.2
  ) {
    const grossProfit = mostExpensive.price - cheapest.price
    const netProfit = grossProfit - mostExpensive.price * 0.035
    arbitrage = {
      buyFrom: cheapest,
      sellOn: mostExpensive,
      buyPrice: cheapest.price,
      sellPrice: mostExpensive.price,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      marginPercent: Math.round((netProfit / mostExpensive.price) * 100),
    }
  }

  const breakdown = {
    takealot: (takealotProducts as unknown[]).length,
    makro: (makroProducts as unknown[]).length,
    game: (gameProducts as unknown[]).length,
    bidorbuy: (bidorbuyProducts as unknown[]).length,
    hivve: (hivveProducts as unknown[]).length,
  }

  return NextResponse.json({
    query,
    totalResults: allProducts.length,
    products: allProducts,
    arbitrage,
    breakdown,
  })
}
