// Takealot Marketplace Seller API integration
// Seller Portal API base: https://seller-api.takealot.com/v2
// Auth: Bearer token via TAKEALOT_SELLER_API_KEY env var

const BASE_URL = 'https://seller-api.takealot.com/v2'

function getApiKey(): string | null {
  return process.env.TAKEALOT_SELLER_API_KEY || null
}

function headers() {
  const key = getApiKey()
  if (!key) throw new Error('TAKEALOT_SELLER_API_KEY is not configured')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Takealot API error ${response.status}: ${errorText}`)
  }

  return response.json() as Promise<T>
}

export interface TakealotCatalogItem {
  tsin: string
  title: string
  barcode: string
  category: string
  image_url: string
}

export interface TakealotListing {
  offer_id: string
  tsin: string
  sku: string
  title: string
  selling_price: number
  rrp: number
  stock_at_takealot: number
  status: string
  listing_url: string
}

export interface TakealotOrder {
  order_id: string
  order_date: string
  status: string
  line_items: Array<{
    sku: string
    title: string
    quantity: number
    selling_price: number
  }>
  shipping_address: Record<string, string>
  total: number
}

export async function searchTakealotCatalog(
  barcode?: string,
  title?: string
): Promise<TakealotCatalogItem[]> {
  if (!getApiKey()) return []

  try {
    const params = new URLSearchParams()
    if (barcode) params.set('barcode', barcode)
    if (title) params.set('title', title)

    const data = await apiFetch<{ results: TakealotCatalogItem[] }>(
      `/catalog/products?${params.toString()}`
    )
    return data.results || []
  } catch (err) {
    console.error('[Takealot] searchCatalog error:', err)
    return []
  }
}

export async function createListing(params: {
  title: string
  description: string
  sellingPrice: number
  rrp: number
  images: string[]
  category: string
  sku: string
  stock: number
}): Promise<{ success: boolean; listingId?: string; listingUrl?: string; error?: string }> {
  if (!getApiKey()) {
    return {
      success: false,
      error: 'TAKEALOT_SELLER_API_KEY is not configured. Connect your seller account in Settings.',
    }
  }

  try {
    const payload = {
      sku: params.sku,
      title: params.title,
      description: params.description,
      selling_price: params.sellingPrice,
      rrp: params.rrp,
      images: params.images,
      category: params.category,
      stock_quantity: params.stock,
    }

    const data = await apiFetch<{ offer_id: string; listing_url: string }>(
      '/offers',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    return {
      success: true,
      listingId: data.offer_id,
      listingUrl: data.listing_url,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Takealot] createListing error:', msg)
    return { success: false, error: msg }
  }
}

export async function updateStock(
  sku: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!getApiKey()) {
    return { success: false, error: 'TAKEALOT_SELLER_API_KEY not configured' }
  }

  try {
    await apiFetch(`/offers/${sku}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export async function getMyListings(
  page = 1
): Promise<{ listings: TakealotListing[]; total: number; error?: string }> {
  if (!getApiKey()) {
    return { listings: [], total: 0, error: 'TAKEALOT_SELLER_API_KEY not configured' }
  }

  try {
    const data = await apiFetch<{ offers: TakealotListing[]; total_results: number }>(
      `/offers?page=${page}&page_size=50`
    )
    return { listings: data.offers || [], total: data.total_results || 0 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Takealot] getMyListings error:', msg)
    return { listings: [], total: 0, error: msg }
  }
}

export async function getOrders(
  status?: string
): Promise<{ orders: TakealotOrder[]; error?: string }> {
  if (!getApiKey()) {
    return { orders: [], error: 'TAKEALOT_SELLER_API_KEY not configured' }
  }

  try {
    const params = new URLSearchParams({ page_size: '100' })
    if (status) params.set('status', status)

    const data = await apiFetch<{ orders: TakealotOrder[] }>(
      `/orders?${params.toString()}`
    )
    return { orders: data.orders || [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Takealot] getOrders error:', msg)
    return { orders: [], error: msg }
  }
}

export function isConfigured(): boolean {
  return Boolean(getApiKey())
}
