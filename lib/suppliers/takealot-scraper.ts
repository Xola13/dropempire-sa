// Takealot scraper — uses their internal REST API directly
// API confirmed working: api.takealot.com/rest/v-1-10-0/searches/products

export interface TakealotProduct {
  id: string
  name: string
  price: number
  originalPrice: number | null
  inStock: boolean
  url: string
  imageUrl: string
  category: string
  rating: number | null
  reviewCount: number | null
  deliveryDays: string
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-ZA,en;q=0.9',
  'Origin': 'https://www.takealot.com',
  'Referer': 'https://www.takealot.com/',
}

// Actual response shape from api.takealot.com
interface TakealotApiResult {
  type?: string
  product_views?: {
    core?: {
      id?: number
      title?: string
      slug?: string
      star_rating?: number
      reviews?: number
    }
    gallery?: {
      images?: string[]
    }
    buybox_summary?: {
      prices?: number[]
      product_id?: number
      tsin?: number
      is_add_to_cart_available?: boolean
    }
    stock_availability_summary?: {
      is_in_stock?: boolean
    }
  }
}

interface TakealotApiResponse {
  sections?: {
    products?: {
      results?: TakealotApiResult[]
    }
  }
}

export async function searchProducts(query: string): Promise<TakealotProduct[]> {
  try {
    const params = new URLSearchParams({
      newsearch: 'true',
      qsearch: query,
      resultset_collapse: 'true',
      num_results: '20',
      start: '0',
    })
    const url = `https://api.takealot.com/rest/v-1-10-0/searches/products?${params}`
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) throw new Error(`Takealot API ${res.status}`)

    const data: TakealotApiResponse = await res.json()
    const results = data.sections?.products?.results || []

    const products: TakealotProduct[] = []

    for (const item of results) {
      if (item.type !== 'product_views' || !item.product_views) continue
      const pv = item.product_views
      const core = pv.core || {}
      const buybox = pv.buybox_summary || {}

      const name = core.title?.trim()
      if (!name || name.length < 3) continue

      // prices[] is array of all seller prices — use the lowest (first)
      const price = buybox.prices?.[0] ?? 0
      if (!price || price < 1) continue

      const productId = buybox.product_id || core.id || 0
      const slug = core.slug || ''
      const productUrl = slug
        ? `https://www.takealot.com/${slug}/PLID${productId}`
        : `https://www.takealot.com/all?qsearch=${encodeURIComponent(query)}`

      // Image: replace {size} placeholder with a real size
      const rawImg = pv.gallery?.images?.[0] || ''
      const imageUrl = rawImg.replace('{size}', 'pdpxl')

      products.push({
        id: `takealot-${productId || products.length}`,
        name,
        price,
        originalPrice: buybox.prices && buybox.prices.length > 1
          ? buybox.prices[buybox.prices.length - 1]
          : null,
        inStock: pv.stock_availability_summary?.is_in_stock !== false,
        url: productUrl,
        imageUrl,
        category: '',
        rating: core.star_rating || null,
        reviewCount: core.reviews || null,
        deliveryDays: '1-3 business days',
      })
    }

    return products
  } catch (e) {
    console.error('Takealot search error:', e)
    return []
  }
}

export async function getProductDetails(url: string): Promise<TakealotProduct | null> {
  try {
    const plidMatch = url.match(/PLID(\d+)/)
    if (!plidMatch) return null
    const res = await fetch(
      `https://api.takealot.com/rest/v-1-10-0/product-details/${plidMatch[1]}?platform=desktop`,
      { headers: HEADERS, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    const name = (data.title || data.name || '') as string
    const price = (data.price || 0) as number
    if (!name || !price) return null
    return {
      id: plidMatch[1],
      name,
      price,
      originalPrice: null,
      inStock: true,
      url,
      imageUrl: '',
      category: '',
      rating: null,
      reviewCount: null,
      deliveryDays: '1-3 business days',
    }
  } catch { return null }
}
