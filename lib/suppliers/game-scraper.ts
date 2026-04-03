// Game Stores scraper — uses Playwright (Cloudflare blocks plain fetch)
// Shares a single browser instance to avoid resource exhaustion

import { chromium } from 'playwright'

export interface GameProduct {
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

function parseSAPrice(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/R/gi, '').replace(/\s/g, '')
  const normalized = cleaned.replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
  const p = parseFloat(normalized)
  return p > 0 && p < 500000 ? p : 0
}

export async function searchProducts(query: string): Promise<GameProduct[]> {
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

    const url = `https://www.game.co.za/en/search/?text=${encodeURIComponent(query)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    // Wait for product cards to appear
    await page.waitForSelector('[class*="product"], [class*="Product"], article', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const products = await page.evaluate((): Array<{
      name: string; price: string; imageUrl: string; url: string
    }> => {
      const items: Array<{ name: string; price: string; imageUrl: string; url: string }> = []

      // Try multiple selector patterns Game uses
      const cards = document.querySelectorAll(
        '[class*="product-card"], [class*="ProductCard"], [class*="product-item"], [class*="product-tile"], [class*="productCard"], li[class*="product"], div[data-product]'
      )

      cards.forEach((el, i) => {
        if (i >= 20) return
        const nameEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"], [class*="description"]')
        const priceEl = el.querySelector('[class*="price"], [class*="Price"], [class*="amount"], [class*="cost"]')
        const imgEl = el.querySelector('img') as HTMLImageElement | null
        const linkEl = el.querySelector('a') as HTMLAnchorElement | null

        const name = nameEl?.textContent?.trim() || ''
        const price = priceEl?.textContent?.trim() || ''
        if (name.length < 4 || !price) return

        items.push({
          name,
          price,
          imageUrl: imgEl?.src || imgEl?.getAttribute('data-src') || '',
          url: linkEl?.href || window.location.href,
        })
      })

      // Fallback: scan page for price+name pairs using __NEXT_DATA__ or embedded JSON
      if (items.length === 0) {
        const scripts = document.querySelectorAll('script:not([src])')
        for (const script of scripts) {
          const content = script.textContent || ''
          if (!content.includes('"price"') && !content.includes('selling_price')) continue
          try {
            const dataMatch = content.match(/\{[\s\S]{100,}\}/)
            if (!dataMatch) continue
            const data = JSON.parse(dataMatch[0])
            const str = JSON.stringify(data)
            const pricePattern = /"(?:price|sellingPrice|value)"\s*:\s*"?([\d.]+)"?/g
            const namePattern = /"(?:name|title|productName)"\s*:\s*"([^"]{5,100})"/g
            const prices: string[] = []
            const names: string[] = []
            let m
            while ((m = pricePattern.exec(str)) !== null) {
              const v = parseFloat(m[1])
              if (v > 10 && v < 200000) prices.push(String(v))
            }
            while ((m = namePattern.exec(str)) !== null) {
              if (!m[1].includes('\\') && !m[1].startsWith('@')) names.push(m[1])
            }
            const count = Math.min(names.length, prices.length, 20)
            for (let i = 0; i < count; i++) {
              items.push({ name: names[i], price: prices[i], imageUrl: '', url: window.location.href })
            }
            if (items.length > 0) break
          } catch { continue }
        }
      }

      return items
    })

    return products
      .map((p, i) => ({
        id: `game-${i}-${Date.now()}`,
        name: p.name,
        price: parseSAPrice(p.price),
        originalPrice: null,
        imageUrl: p.imageUrl,
        url: p.url,
        category: '',
        inStock: true,
        deliveryDays: '1-3 business days',
      }))
      .filter(p => p.price > 0 && p.name.length > 2)
  } catch (e) {
    console.error('Game scrape error:', e)
    return []
  } finally {
    await browser.close()
  }
}

export async function getSpecials(): Promise<GameProduct[]> {
  return searchProducts('deals specials')
}
