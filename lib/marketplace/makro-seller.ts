// Makro Marketplace Seller API integration
// Seller portal: seller.makro.co.za
// Base: https://api.seller.makro.co.za/v1
// Auth: API key via MAKRO_SELLER_API_KEY env var

const BASE_URL = 'https://api.seller.makro.co.za/v1'

function getApiKey(): string | null {
  return process.env.MAKRO_SELLER_API_KEY || null
}

function headers() {
  const key = getApiKey()
  if (!key) throw new Error('MAKRO_SELLER_API_KEY is not configured')
  return {
    'X-API-Key': key,
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
    throw new Error(`Makro Seller API error ${response.status}: ${errorText}`)
  }

  return response.json() as Promise<T>
}

export interface MakroListing {
  listing_id: string
  sku: string
  title: string
  price: number
  stock: number
  status: 'active' | 'inactive' | 'pending' | 'rejected'
  ean?: string
  listing_url?: string
  created_at: string
}

export interface MakroOrder {
  order_id: string
  created_at: string
  status: string
  customer_name: string
  shipping_address: Record<string, string>
  line_items: Array<{
    sku: string
    title: string
    quantity: number
    price: number
  }>
  total: number
}

export async function createListing(params: {
  title: string
  description: string
  price: number
  images: string[]
  category: string
  sku: string
  ean?: string
}): Promise<{ success: boolean; listingId?: string; listingUrl?: string; error?: string }> {
  if (!getApiKey()) {
    return {
      success: false,
      error: 'MAKRO_SELLER_API_KEY is not configured. Connect your seller account in Settings.',
    }
  }

  try {
    const payload = {
      sku: params.sku,
      title: params.title,
      description: params.description,
      price: params.price,
      images: params.images,
      category: params.category,
      ean: params.ean || null,
    }

    const data = await apiFetch<{ listing_id: string; listing_url: string }>(
      '/listings',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    return {
      success: true,
      listingId: data.listing_id,
      listingUrl: data.listing_url,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Makro] createListing error:', msg)
    return { success: false, error: msg }
  }
}

export async function getMyListings(): Promise<{
  listings: MakroListing[]
  error?: string
}> {
  if (!getApiKey()) {
    return { listings: [], error: 'MAKRO_SELLER_API_KEY not configured' }
  }

  try {
    const data = await apiFetch<{ listings: MakroListing[] }>('/listings?limit=100')
    return { listings: data.listings || [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Makro] getMyListings error:', msg)
    return { listings: [], error: msg }
  }
}

export async function getOrders(): Promise<{
  orders: MakroOrder[]
  error?: string
}> {
  if (!getApiKey()) {
    return { orders: [], error: 'MAKRO_SELLER_API_KEY not configured' }
  }

  try {
    const data = await apiFetch<{ orders: MakroOrder[] }>('/orders?limit=100&status=new,confirmed,shipped')
    return { orders: data.orders || [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Makro] getOrders error:', msg)
    return { orders: [], error: msg }
  }
}

export async function updateListing(
  sku: string,
  updates: Partial<{ price: number; stock: number }>
): Promise<{ success: boolean; error?: string }> {
  if (!getApiKey()) {
    return { success: false, error: 'MAKRO_SELLER_API_KEY not configured' }
  }

  try {
    await apiFetch(`/listings/${sku}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Makro] updateListing error:', msg)
    return { success: false, error: msg }
  }
}

export function isConfigured(): boolean {
  return Boolean(getApiKey())
}
