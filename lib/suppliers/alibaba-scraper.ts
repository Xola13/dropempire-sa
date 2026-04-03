import { chromium } from 'playwright'

export interface AlibabaProduct {
  id: string
  name: string
  minPrice: number
  maxPrice: number
  minOrder: number
  imageUrl: string
  url: string
  category: string
  supplierName: string
  supplierCountry: string
  yearsOnPlatform: number
  rating: number
}

const BASE_URL = 'https://www.alibaba.com'

export async function searchProducts(keyword: string): Promise<AlibabaProduct[]> {
  let browser = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    })
    const page = await context.newPage()

    const searchUrl = `${BASE_URL}/trade/search?SearchText=${encodeURIComponent(keyword)}&sortType=user_rate_dsc`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const products = await page.evaluate((kw: string) => {
      const results: Array<{
        name: string
        minPrice: number
        maxPrice: number
        minOrder: number
        imageUrl: string
        url: string
        category: string
        supplierName: string
        supplierCountry: string
        yearsOnPlatform: number
        rating: number
      }> = []

      // Alibaba product card selectors
      const cards = document.querySelectorAll(
        '[class*="organic-offer-wrapper"], [class*="offer-item"], .fy23-search-card, [data-content="offerCard"]'
      )

      cards.forEach(card => {
        try {
          const nameEl = card.querySelector(
            '[class*="title"], h2, h3, [class*="product-name"], [class*="offer-title"]'
          )
          const name = nameEl?.textContent?.trim() || ''
          if (!name || name.length < 3) return

          const priceEl = card.querySelector(
            '[class*="price"], [class*="Price"]'
          )
          const priceText = priceEl?.textContent?.trim() || '0'
          const prices = priceText.match(/[\d,.]+/g) || ['0']
          const minPrice = parseFloat(prices[0]?.replace(/,/g, '') || '0')
          const maxPrice = parseFloat(
            (prices[prices.length - 1] || prices[0] || '0').replace(/,/g, '')
          )

          const imgEl = card.querySelector('img')
          const imageUrl =
            imgEl?.getAttribute('data-src') ||
            imgEl?.getAttribute('src') ||
            imgEl?.getAttribute('data-lazy-src') ||
            ''

          const linkEl = card.querySelector('a')
          const rawHref = linkEl?.getAttribute('href') || ''
          const url = rawHref.startsWith('http')
            ? rawHref
            : rawHref.startsWith('//')
            ? `https:${rawHref}`
            : `${BASE_URL}${rawHref}`

          const moqEl = card.querySelector(
            '[class*="moq"], [class*="min-order"], [class*="MinOrder"]'
          )
          const moqText = moqEl?.textContent?.trim() || '1'
          const minOrder = parseInt(moqText.match(/\d+/)?.[0] || '1', 10)

          const supplierEl = card.querySelector(
            '[class*="company"], [class*="supplier"], [class*="seller-name"]'
          )
          const supplierName = supplierEl?.textContent?.trim() || 'Unknown Supplier'

          const countryEl = card.querySelector('[class*="country"], [class*="location"]')
          const supplierCountry = countryEl?.textContent?.trim() || 'China'

          const yearsEl = card.querySelector('[class*="year"], [class*="Years"]')
          const yearsText = yearsEl?.textContent?.trim() || '0'
          const yearsOnPlatform = parseInt(yearsText.match(/\d+/)?.[0] || '0', 10)

          const ratingEl = card.querySelector('[class*="star"], [class*="rating"], [class*="score"]')
          const ratingText = ratingEl?.textContent?.trim() || '4.5'
          const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '4.5')

          results.push({
            name,
            minPrice,
            maxPrice: maxPrice || minPrice,
            minOrder: minOrder || 1,
            imageUrl,
            url,
            category: kw,
            supplierName,
            supplierCountry,
            yearsOnPlatform,
            rating: isNaN(rating) ? 4.5 : rating,
          })
        } catch {
          // skip malformed cards
        }
      })

      return results
    }, keyword)

    // Sort by best price/moq ratio (lower price per unit = higher score)
    const mapped: AlibabaProduct[] = products
      .filter(p => p.name && p.url && p.url !== BASE_URL)
      .map((p, i) => ({
        ...p,
        id: `alibaba-${Date.now()}-${i}`,
        maxPrice: p.maxPrice || p.minPrice,
      }))
      .sort((a, b) => {
        // Score: lower price = better, higher years on platform = better
        const scoreA = (a.minPrice > 0 ? 1 / a.minPrice : 0) + a.yearsOnPlatform * 0.1
        const scoreB = (b.minPrice > 0 ? 1 / b.minPrice : 0) + b.yearsOnPlatform * 0.1
        return scoreB - scoreA
      })
      .slice(0, 20)

    return mapped
  } catch (err) {
    console.error('[Alibaba scraper] searchProducts error:', err)
    return []
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

export async function getBestsellers(category?: string): Promise<AlibabaProduct[]> {
  const searchTerm = category || 'trending products bestseller'
  return searchProducts(searchTerm)
}
