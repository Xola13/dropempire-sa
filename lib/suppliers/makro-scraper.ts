// Makro scraper — parses their server-rendered HTML
// Products are in JSON-LD ItemList (names + URLs)
// Prices are in the page's JS state as cents (9900 = R99.00)

export interface MakroProduct {
  id: string
  name: string
  price: number
  originalPrice: number | null
  inStock: boolean
  url: string
  imageUrl: string
  category: string
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'en-ZA,en;q=0.9',
  'Cache-Control': 'no-cache',
}

export async function searchProducts(query: string, _category?: string): Promise<MakroProduct[]> {
  try {
    const url = `https://www.makro.co.za/search?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`Makro fetch ${res.status}`)
    const html = await res.text()

    // 1. Extract product names + URLs from JSON-LD ItemList
    //    Format: {"@type":"ListItem","position":N,"url":"https://www.makro.co.za/...","name":"..."}
    const listItems: Array<{ name: string; url: string; position: number }> = []
    const listItemPattern = /"@type"\s*:\s*"ListItem"\s*,\s*"position"\s*:\s*(\d+)\s*,\s*"url"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"([^"]+)"/g
    let m
    while ((m = listItemPattern.exec(html)) !== null) {
      const pos = parseInt(m[1])
      const itemUrl = m[2].split('?')[0] // strip tracking params
      const name = m[3]
      if (name.length > 3 && itemUrl.includes('makro.co.za')) {
        // dedupe by position
        if (!listItems.find(i => i.position === pos)) {
          listItems.push({ name, url: itemUrl, position: pos })
        }
      }
    }

    if (listItems.length === 0) return []

    // 2. Extract SPECIAL_PRICE values (in cents) in order they appear
    //    Format: "priceType":"SPECIAL_PRICE","price":"9900"
    //    or:     "priceType":"FSP","price":"9900" (fallback)
    const specialPrices: number[] = []
    const fspPrices: number[] = []

    const specialPattern = /"priceType"\s*:\s*"SPECIAL_PRICE"\s*,"price"\s*:\s*"(\d+)"/g
    const fspPattern = /"priceType"\s*:\s*"FSP"\s*,"price"\s*:\s*"(\d+)"/g

    let sm
    while ((sm = specialPattern.exec(html)) !== null) specialPrices.push(parseInt(sm[1]))
    while ((sm = fspPattern.exec(html)) !== null) fspPrices.push(parseInt(sm[1]))

    // 3. Extract images — Makro CDN images
    const imgPattern = /https:\/\/media\.makro\.co\.za\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi
    const imgUrls: string[] = []
    let imgMatch
    while ((imgMatch = imgPattern.exec(html)) !== null) {
      if (!imgUrls.includes(imgMatch[0])) imgUrls.push(imgMatch[0])
    }

    // 4. Merge: match each product by index
    const results: MakroProduct[] = []
    const sorted = listItems.sort((a, b) => a.position - b.position).slice(0, 20)

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      // Price is in cents — divide by 100 for ZAR
      const specialCents = specialPrices[i]
      const fspCents = fspPrices[i]
      const priceCents = specialCents || fspCents
      if (!priceCents) continue

      const price = priceCents / 100
      const originalPrice = specialCents && fspCents && fspCents > specialCents
        ? fspCents / 100
        : null

      results.push({
        id: `makro-${i}-${item.url.split('/').pop()?.slice(0, 10)}`,
        name: item.name,
        price,
        originalPrice,
        inStock: true,
        url: item.url,
        imageUrl: imgUrls[i] || '',
        category: '',
      })
    }

    return results.filter(p => p.price > 0)
  } catch (e) {
    console.error('Makro search error:', e)
    return []
  }
}

export async function getProductDetails(url: string): Promise<MakroProduct | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const html = await res.text()
    const nameMatch = html.match(/<h1[^>]*>([^<]{5,120})<\/h1>/)
    const priceMatch = html.match(/"priceType"\s*:\s*"SPECIAL_PRICE"\s*,"price"\s*:\s*"(\d+)"/)
    if (!nameMatch || !priceMatch) return null
    return {
      id: url.split('/').pop()?.split('?')[0] || '',
      name: nameMatch[1].trim(),
      price: parseInt(priceMatch[1]) / 100,
      originalPrice: null,
      inStock: true,
      url,
      imageUrl: '',
      category: '',
    }
  } catch { return null }
}

export async function checkStock(productUrl: string): Promise<boolean> {
  const p = await getProductDetails(productUrl)
  return p?.inStock ?? false
}
