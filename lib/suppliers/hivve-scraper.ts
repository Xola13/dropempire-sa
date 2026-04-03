// Hivve scraper — hivve.co.za (SA wholesale/B2B supplier)
// Their search API returns product IDs + names as JSON
// Product pages are Cloudflare-protected — we use the search API data directly
// and fill in prices from embedded JSON on their category/listing pages

export interface HivveProduct {
  id: string
  name: string
  price: number
  originalPrice: number | null
  imageUrl: string
  url: string
  category: string
  inStock: boolean
  deliveryDays: string
}

function parseSAPrice(raw: unknown): number {
  if (typeof raw === 'number') return raw > 0 && raw < 500000 ? raw : 0
  if (!raw) return 0
  const cleaned = String(raw).replace(/R/gi, '').replace(/\s/g, '')
  const normalized = cleaned.replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
  const p = parseFloat(normalized)
  return p > 0 && p < 500000 ? p : 0
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'en-ZA,en;q=0.9',
  'Referer': 'https://www.hivve.co.za/',
}

interface HivveSearchResult {
  id: number
  name: string
  price?: number
  variants?: Array<{ price?: number; compare_at_price?: number }>
  featured_image?: string
  images?: string[]
  handle?: string
}

export async function searchProducts(keyword: string): Promise<HivveProduct[]> {
  // Try 1: Shopify JSON search — Hivve uses Shopify which has a predictable JSON API
  try {
    const res = await fetch(
      `https://www.hivve.co.za/search/suggest.json?q=${encodeURIComponent(keyword)}&resources[type]=product&resources[limit]=10`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json() as {
        resources?: {
          results?: {
            products?: Array<{
              id: number
              title: string
              price?: string
              image?: string
              url?: string
              handle?: string
            }>
          }
        }
      }
      const items = data.resources?.results?.products || []
      if (items.length > 0) {
        return items.map(p => {
          const price = parseSAPrice(p.price)
          const slug = p.handle || p.url?.split('/').pop() || ''
          return {
            id: `hivve-${p.id}`,
            name: p.title,
            price,
            originalPrice: null,
            imageUrl: p.image || '',
            url: `https://www.hivve.co.za/products/${slug}`,
            category: '',
            inStock: true,
            deliveryDays: '2-5 business days',
          }
        }).filter(p => p.price > 0 || p.name.length > 2)
      }
    }
  } catch { /* fall through */ }

  // Try 2: Shopify product JSON API on search page
  try {
    const res = await fetch(
      `https://www.hivve.co.za/search?q=${encodeURIComponent(keyword)}&view=json`,
      { headers: { ...HEADERS, 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      try {
        const data = await res.json() as { products?: HivveSearchResult[] }
        const items = (data.products || []).slice(0, 10)
        if (items.length > 0) {
          return items.map((p, i) => {
            const price = parseSAPrice(p.price || p.variants?.[0]?.price)
            const slug = p.handle || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const imgRaw = p.featured_image || p.images?.[0] || ''
            return {
              id: `hivve-${p.id || i}`,
              name: p.name,
              price,
              originalPrice: parseSAPrice(p.variants?.[0]?.compare_at_price) || null,
              imageUrl: imgRaw,
              url: `https://www.hivve.co.za/products/${slug}-${p.id}`,
              category: '',
              inStock: true,
              deliveryDays: '2-5 business days',
            }
          }).filter(p => p.name.length > 2)
        }
      } catch { /* fall through */ }
    }
  } catch { /* fall through */ }

  // Try 3: Standard Hivve search API (returns product names + IDs)
  try {
    const res = await fetch(
      `https://www.hivve.co.za/search?q=${encodeURIComponent(keyword)}`,
      { headers: { ...HEADERS, 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      try {
        const data = await res.json() as { products?: HivveSearchResult[] }
        const items = (data.products || []).slice(0, 10)
        return items.map((p, i) => {
          const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          return {
            id: `hivve-${p.id || i}`,
            name: p.name,
            price: parseSAPrice(p.price),
            originalPrice: null,
            imageUrl: p.featured_image || '',
            url: `https://www.hivve.co.za/products/${slug}-${p.id}`,
            category: '',
            inStock: true,
            deliveryDays: '2-5 business days',
          }
        }).filter(p => p.name.length > 2)
      } catch { /* fall through */ }
    }
  } catch { /* fall through */ }

  return []
}
