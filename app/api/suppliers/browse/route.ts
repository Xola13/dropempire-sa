import { NextRequest, NextResponse } from 'next/server'
import * as makro from '@/lib/suppliers/makro-scraper'
import * as takealot from '@/lib/suppliers/takealot-scraper'
import * as game from '@/lib/suppliers/game-scraper'
import * as bidorbuy from '@/lib/suppliers/bidorbuy-scraper'
import { searchGumtreeWholesale } from '@/lib/suppliers/sa-wholesaler-scraper'
import * as hivve from '@/lib/suppliers/hivve-scraper'
import { calculateSuggestedPrice, calculateMargin } from '@/lib/suppliers/index'

// Search local SA suppliers — no AI key needed, completely free
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || ''
  const supplier = req.nextUrl.searchParams.get('supplier') || 'takealot'

  if (!query) return NextResponse.json({ error: 'q is required' }, { status: 400 })

  try {
    if (supplier === 'takealot') {
      const products = await takealot.searchProducts(query)
      return NextResponse.json({
        supplier: 'takealot',
        deliveryLabel: '🇿🇦 1-3 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: p.originalPrice,
          image: p.imageUrl,
          url: p.url,
          inStock: p.inStock,
          deliveryDays: p.deliveryDays,
          supplier: 'takealot',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true)),
        })),
      })
    }

    if (supplier === 'makro') {
      const products = await makro.searchProducts(query)
      return NextResponse.json({
        supplier: 'makro',
        deliveryLabel: '🇿🇦 2-4 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: p.originalPrice,
          image: p.imageUrl,
          url: p.url,
          inStock: p.inStock,
          deliveryDays: '2-4 business days',
          supplier: 'makro',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true)),
        })),
      })
    }

    if (supplier === 'game') {
      const products = await game.searchProducts(query)
      return NextResponse.json({
        supplier: 'game',
        deliveryLabel: '🇿🇦 1-3 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: p.originalPrice,
          image: p.imageUrl,
          url: p.url,
          inStock: p.inStock,
          deliveryDays: p.deliveryDays,
          supplier: 'game',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true)),
        })),
      })
    }

    if (supplier === 'bidorbuy') {
      const products = await bidorbuy.searchProducts(query)
      return NextResponse.json({
        supplier: 'bidorbuy',
        deliveryLabel: '🇿🇦 1-3 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: p.originalPrice,
          image: p.imageUrl,
          url: p.url,
          inStock: true,
          deliveryDays: p.deliveryDays,
          supplier: 'bidorbuy',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true)),
        })),
      })
    }

    if (supplier === 'gumtree') {
      const products = await searchGumtreeWholesale(query)
      return NextResponse.json({
        supplier: 'gumtree',
        deliveryLabel: '🇿🇦 1-3 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: null,
          image: p.imageUrl,
          url: p.url,
          inStock: true,
          deliveryDays: p.deliveryDays,
          supplier: 'gumtree',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: p.price > 0
            ? Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true))
            : 0,
        })),
      })
    }

    if (supplier === 'hivve') {
      const products = await hivve.searchProducts(query)
      return NextResponse.json({
        supplier: 'hivve',
        deliveryLabel: '🇿🇦 2-5 business days',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierPrice: p.price,
          originalPrice: p.originalPrice,
          image: p.imageUrl,
          url: p.url,
          inStock: p.inStock,
          deliveryDays: p.deliveryDays,
          supplier: 'hivve',
          suggestedPrice: calculateSuggestedPrice(p.price, true),
          estimatedMargin: Math.round(calculateMargin(p.price, calculateSuggestedPrice(p.price, true), true)),
        })),
      })
    }

    return NextResponse.json({ error: 'Unknown supplier' }, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Supplier search failed'
    console.error('Supplier browse error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
