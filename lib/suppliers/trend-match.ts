import { searchProducts as searchTakealot } from './takealot-scraper'
import { searchProducts as searchMakro } from './makro-scraper'
import { searchProducts as searchHivve } from './hivve-scraper'

// Looks up a trending product across the local SA sources that work without a browser
// (Game and Bidorbuy need Playwright, which cannot run on Vercel). These are retailers
// and one wholesaler, so the numbers show whether a product could be resold at the going
// market price, not a guaranteed margin.

export type LocalSource = 'takealot' | 'makro' | 'hivve'

export interface RawLocalProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
  url: string
  inStock?: boolean
}

export interface LocalMatch {
  source: LocalSource
  id: string
  name: string
  cost: number
  imageUrl: string
  url: string
  inStock: boolean
  /** Margin if resold at the median market price, after the 3.5% payment fee. Percent. */
  marginAtMarket: number
}

export interface TrendMatchResult {
  keyword: string
  /** Median price of the in-stock matches, or null if there were none. */
  marketPrice: number | null
  matches: LocalMatch[]
  /** Sources that returned an error or timed out, so a short list is not mistaken for "nothing exists". */
  failedSources: LocalSource[]
}

const PAYMENT_FEE = 0.035

const tokens = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2)

/** A product is relevant when at least half of the keyword's words appear in its name. */
export function isRelevant(keyword: string, name: string): boolean {
  const want = tokens(keyword)
  if (want.length === 0) return false
  const have = new Set(tokens(name))
  const hits = want.filter(t => have.has(t)).length
  return hits / want.length >= 0.5
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Pure: filters, prices and ranks raw search results. In-stock first, then best margin. */
export function rankMatches(
  keyword: string,
  bySource: Partial<Record<LocalSource, RawLocalProduct[]>>,
  limit = 12,
): { marketPrice: number | null; matches: LocalMatch[] } {
  const relevant: Array<{ source: LocalSource; p: RawLocalProduct }> = []
  for (const [source, list] of Object.entries(bySource) as Array<[LocalSource, RawLocalProduct[] | undefined]>) {
    for (const p of list ?? []) {
      if (p.price > 0 && Number.isFinite(p.price) && p.name && isRelevant(keyword, p.name)) {
        relevant.push({ source, p })
      }
    }
  }

  const marketPrice = median(relevant.filter(r => r.p.inStock !== false).map(r => r.p.price))

  const matches = relevant.map(({ source, p }): LocalMatch => {
    const margin =
      marketPrice && marketPrice > 0
        ? ((marketPrice - p.price - marketPrice * PAYMENT_FEE) / marketPrice) * 100
        : 0
    return {
      source,
      id: `${source}-${p.id}`,
      name: p.name,
      cost: p.price,
      imageUrl: p.imageUrl ?? '',
      url: p.url,
      inStock: p.inStock !== false,
      marginAtMarket: Math.round(margin * 10) / 10,
    }
  })

  matches.sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.marginAtMarket - a.marginAtMarket)
  return { marketPrice: marketPrice === null ? null : Math.round(marketPrice * 100) / 100, matches: matches.slice(0, limit) }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

export async function matchTrendToLocal(keyword: string): Promise<TrendMatchResult> {
  const sources: Array<[LocalSource, () => Promise<RawLocalProduct[]>]> = [
    ['takealot', () => searchTakealot(keyword)],
    ['makro', () => searchMakro(keyword)],
    ['hivve', () => searchHivve(keyword)],
  ]
  const settled = await Promise.allSettled(sources.map(([, run]) => withTimeout(run(), 20000)))

  const bySource: Partial<Record<LocalSource, RawLocalProduct[]>> = {}
  const failedSources: LocalSource[] = []
  settled.forEach((r, i) => {
    const name = sources[i][0]
    if (r.status === 'fulfilled') bySource[name] = r.value
    else failedSources.push(name)
  })

  return { keyword, ...rankMatches(keyword, bySource), failedSources }
}
