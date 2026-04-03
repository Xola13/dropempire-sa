import { chromium } from 'playwright'

export interface DHgateProduct {
  id: string
  name: string
  minPrice: number
  maxPrice: number
  minOrder: number
  imageUrl: string
  url: string
  category: string
  soldCount: number
  rating: number
  supplier: string
}

const BASE_URL = 'https://www.dhgate.com'

function parsePrice(text: string): number {
  const clean = text.replace(/[^0-9.]/g, '')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

function parseSoldCount(text: string): number {
  const lower = text.toLowerCase()
  const match = lower.match(/([\d,]+)\s*(?:sold|orders?|pieces?)/i)
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10)
  }
  const numMatch = text.match(/[\d,]+/)
  if (numMatch) return parseInt(numMatch[0].replace(/,/g, ''), 10)
  return 0
}

export async function getBestsellers(category?: string): Promise<DHgateProduct[]> {
  let browser = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    const url = category
      ? `${BASE_URL}/wholesale/${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}.html`
      : `${BASE_URL}/wholesale/bestselling.html`

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const products = await page.evaluate(() => {
      const results: Array<{
        name: string
        minPrice: number
        maxPrice: number
        minOrder: number
        imageUrl: string
        url: string
        category: string
        soldCount: number
        rating: number
      }> = []

      // DHgate product card selectors (multiple patterns for resilience)
      const cards = document.querySelectorAll(
        '.gallery-item, .item-img-wrap, [class*="gallery"], [class*="product-item"], .product-wrap'
      )

      cards.forEach(card => {
        try {
          const nameEl = card.querySelector(
            '.item-name, .gallery-item-tit, [class*="item-title"], h2, h3, .title'
          )
          const name = nameEl?.textContent?.trim() || ''
          if (!name) return

          const priceEl = card.querySelector(
            '.item-price, .gallery-price, [class*="price"], .price'
          )
          const priceText = priceEl?.textContent?.trim() || '0'
          const prices = priceText.match(/[\d.]+/g) || ['0']
          const minPrice = parseFloat(prices[0] || '0')
          const maxPrice = parseFloat(prices[prices.length - 1] || prices[0] || '0')

          const imgEl = card.querySelector('img')
          const imageUrl =
            imgEl?.getAttribute('data-src') ||
            imgEl?.getAttribute('src') ||
            imgEl?.getAttribute('data-lazy') ||
            ''

          const linkEl = card.querySelector('a')
          const relUrl = linkEl?.getAttribute('href') || ''
          const url = relUrl.startsWith('http') ? relUrl : `https://www.dhgate.com${relUrl}`

          const soldEl = card.querySelector('[class*="sold"], [class*="order"], .item-sold')
          const soldText = soldEl?.textContent?.trim() || '0'
          const soldCount = parseInt(soldText.replace(/[^0-9]/g, '') || '0', 10)

          const ratingEl = card.querySelector('[class*="star"], [class*="rating"]')
          const ratingText = ratingEl?.textContent?.trim() || '4.5'
          const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '4.5')

          const moqEl = card.querySelector('[class*="moq"], [class*="min"]')
          const moqText = moqEl?.textContent?.trim() || '1'
          const minOrder = parseInt(moqText.match(/\d+/)?.[0] || '1', 10)

          results.push({
            name,
            minPrice,
            maxPrice: maxPrice || minPrice,
            minOrder: minOrder || 1,
            imageUrl,
            url,
            category: '',
            soldCount,
            rating: isNaN(rating) ? 4.5 : rating,
          })
        } catch {
          // skip malformed cards
        }
      })

      return results
    })

    const mapped: DHgateProduct[] = products
      .filter(p => p.name && p.url && p.url !== BASE_URL)
      .map((p, i) => ({
        ...p,
        id: `dhgate-${Date.now()}-${i}`,
        category: category || 'General',
        supplier: 'DHgate',
        maxPrice: p.maxPrice || p.minPrice,
      }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 20)

    return mapped
  } catch (err) {
    console.error('[DHgate scraper] getBestsellers error:', err)
    return []
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

export async function searchProducts(keyword: string): Promise<DHgateProduct[]> {
  let browser = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    const searchUrl = `${BASE_URL}/wholesale/w/${encodeURIComponent(keyword)}.html?sortby=bestselling`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const products = await page.evaluate((kw: string) => {
      const results: Array<{
        name: string
        minPrice: number
        maxPrice: number
        minOrder: number
        imageUrl: string
        url: string
        category: string
        soldCount: number
        rating: number
      }> = []

      const cards = document.querySelectorAll(
        '.gallery-item, [class*="gallery-item"], .item-img-wrap, [class*="product-item"]'
      )

      cards.forEach(card => {
        try {
          const nameEl = card.querySelector(
            '.item-name, [class*="item-title"], h2, h3, .title, [class*="name"]'
          )
          const name = nameEl?.textContent?.trim() || ''
          if (!name) return

          const priceEl = card.querySelector('[class*="price"], .item-price')
          const priceText = priceEl?.textContent?.trim() || '0'
          const prices = priceText.match(/[\d.]+/g) || ['0']
          const minPrice = parseFloat(prices[0] || '0')
          const maxPrice = parseFloat(prices[prices.length - 1] || prices[0] || '0')

          const imgEl = card.querySelector('img')
          const imageUrl =
            imgEl?.getAttribute('data-src') ||
            imgEl?.getAttribute('src') ||
            ''

          const linkEl = card.querySelector('a')
          const relUrl = linkEl?.getAttribute('href') || ''
          const url = relUrl.startsWith('http') ? relUrl : `https://www.dhgate.com${relUrl}`

          const soldEl = card.querySelector('[class*="sold"], [class*="order"]')
          const soldText = soldEl?.textContent?.trim() || '0'
          const soldCount = parseInt(soldText.replace(/[^0-9]/g, '') || '0', 10)

          const ratingEl = card.querySelector('[class*="star"], [class*="rating"]')
          const ratingText = ratingEl?.textContent?.trim() || '4.5'
          const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '4.5')

          const moqEl = card.querySelector('[class*="moq"], [class*="min"]')
          const minOrder = parseInt(moqEl?.textContent?.match(/\d+/)?.[0] || '1', 10)

          results.push({
            name,
            minPrice,
            maxPrice: maxPrice || minPrice,
            minOrder: minOrder || 1,
            imageUrl,
            url,
            category: kw,
            soldCount,
            rating: isNaN(rating) ? 4.5 : rating,
          })
        } catch {
          // skip
        }
      })

      return results
    }, keyword)

    const mapped: DHgateProduct[] = products
      .filter(p => p.name && p.url && p.url !== BASE_URL)
      .map((p, i) => ({
        ...p,
        id: `dhgate-${Date.now()}-${i}`,
        supplier: 'DHgate',
        maxPrice: p.maxPrice || p.minPrice,
      }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 20)

    return mapped
  } catch (err) {
    console.error('[DHgate scraper] searchProducts error:', err)
    return []
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

// Utility: parse price text helper exposed for tests
export { parsePrice, parseSoldCount }
