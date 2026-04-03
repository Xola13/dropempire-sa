// BidOrBuy scraper — React SPA, all data loaded client-side
// Plain fetch only gets the empty shell — Playwright needed

import { chromium } from 'playwright'

export interface BidorbuyProduct {
  id: string
  name: string
  price: number
  originalPrice: number | null
  imageUrl: string
  url: string
  category: string
  seller: string
  condition: 'new' | 'used' | 'unknown'
  location: string
  deliveryDays: string
}

function parseSAPrice(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/R/gi, '').replace(/\s/g, '')
  const normalized = cleaned.replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
  const p = parseFloat(normalized)
  return p > 0 && p < 500000 ? p : 0
}

export async function searchProducts(keyword: string): Promise<BidorbuyProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-ZA,en;q=0.9',
    })

    const url = `https://www.bidorbuy.co.za/search?q=${encodeURIComponent(keyword)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    // Wait for React to render products
    await page.waitForSelector('[class*="listing"], [class*="product"], [class*="item-card"], article', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2500)

    const products = await page.evaluate((): Array<{
      name: string; price: string; imageUrl: string; url: string
    }> => {
      const items: Array<{ name: string; price: string; imageUrl: string; url: string }> = []

      const cards = document.querySelectorAll(
        '[class*="listing-card"], [class*="listingCard"], [class*="item-card"], [class*="itemCard"], [class*="product-card"], article[class*="listing"]'
      )

      cards.forEach((el, i) => {
        if (i >= 20) return
        const nameEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]')
        const priceEl = el.querySelector('[class*="price"], [class*="Price"], [class*="amount"]')
        const imgEl = el.querySelector('img') as HTMLImageElement | null
        const linkEl = el.querySelector('a') as HTMLAnchorElement | null

        const name = nameEl?.textContent?.trim() || ''
        const price = priceEl?.textContent?.trim() || ''
        if (name.length < 4 || !price) return

        // Skip overseas sellers
        const text = el.textContent?.toLowerCase() || ''
        if (text.includes('china') || text.includes('hong kong')) return

        items.push({
          name,
          price,
          imageUrl: imgEl?.src || imgEl?.getAttribute('data-src') || '',
          url: (linkEl?.href || window.location.href),
        })
      })

      return items
    })

    return products
      .map((p, i) => ({
        id: `bob-${i}-${Date.now()}`,
        name: p.name,
        price: parseSAPrice(p.price),
        originalPrice: null,
        imageUrl: p.imageUrl,
        url: p.url,
        category: '',
        seller: '',
        condition: 'unknown' as const,
        location: 'South Africa',
        deliveryDays: '1-3 business days',
      }))
      .filter(p => p.price > 0 && p.name.length > 2)
  } catch (e) {
    console.error('BidOrBuy scrape error:', e)
    return []
  } finally {
    await browser.close()
  }
}

export async function getBestDeals(category?: string): Promise<BidorbuyProduct[]> {
  return searchProducts(category ? `${category} wholesale` : 'wholesale bulk')
}
