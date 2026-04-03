import { chromium } from 'playwright'

export interface SAWholesaleProduct {
  id: string
  name: string
  price: number
  minOrder: number
  imageUrl: string
  url: string
  source: string
  location: string
  category: string
  contactInfo?: string
  deliveryDays: string
}

function parseSAPrice(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/R/gi, '').replace(/\s/g, '')
  const normalized = cleaned.replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
  const price = parseFloat(normalized)
  return price > 0 && price < 500000 ? price : 0
}

function isWholesaleListing(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('wholesale') ||
    lower.includes('bulk') ||
    lower.includes('joblot') ||
    lower.includes('job lot') ||
    lower.includes('clearance lot') ||
    lower.includes('pallet') ||
    lower.includes('trade price') ||
    lower.includes('per dozen') ||
    lower.includes('per 100') ||
    lower.includes('min order') ||
    lower.includes('minimum order')
  )
}

export async function searchGumtreeWholesale(keyword: string): Promise<SAWholesaleProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    })

    await context.setExtraHTTPHeaders({
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-ZA,en;q=0.9',
      'Cache-Control': 'no-cache',
    })

    const page = await context.newPage()

    const gumtreeUrl = `https://www.gumtree.co.za/s-for-sale/south-africa/${encodeURIComponent(keyword + ' wholesale')}/k0c8688l3100001`

    await page.goto(gumtreeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(4000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(1000)

    await page
      .waitForSelector(
        '[data-q="search-result"], .view, [class*="listing"], article',
        { timeout: 8000 }
      )
      .catch(() => {})

    // Check if Gumtree showed a bot challenge or CAPTCHA page
    const pageText = await page.evaluate(() => document.body.innerText)
    if (
      pageText.toLowerCase().includes('captcha') ||
      pageText.toLowerCase().includes('security check') ||
      pageText.toLowerCase().includes('verify you are human')
    ) {
      console.warn('Gumtree bot detection triggered — returning empty results')
      return []
    }

    const rawItems = await page.evaluate((): Array<{
      name: string
      priceText: string
      imageUrl: string
      url: string
      location: string
      description: string
    }> => {
      const items: Array<{
        name: string
        priceText: string
        imageUrl: string
        url: string
        location: string
        description: string
      }> = []

      const cardSelectors = [
        '[data-q="search-result"]',
        '.view',
        '[class*="listing"]',
        'article',
      ]

      let cards: Element[] = []
      for (const sel of cardSelectors) {
        const found = Array.from(document.querySelectorAll(sel))
        if (found.length >= 3) {
          cards = found
          break
        }
      }

      cards.forEach((el, i) => {
        if (i >= 60) return

        const nameEl = el.querySelector('[data-q="tile-title"], [class*="title"], h2, h3')
        const priceEl = el.querySelector('[data-q="price"], [class*="price"]')
        const imgEl = el.querySelector('img') as HTMLImageElement | null
        const linkEl = el.querySelector('a') as HTMLAnchorElement | null
        const locationEl = el.querySelector(
          '[class*="location"], [data-q="location"], .location, .suburb'
        )
        const descEl = el.querySelector(
          '[class*="description"], [data-q="description"], .description, .snippet'
        )

        if (!nameEl) return

        const href = linkEl?.href || ''
        const fullUrl = href.startsWith('http') ? href : `https://www.gumtree.co.za${href}`

        items.push({
          name: nameEl.textContent?.trim() || '',
          priceText: priceEl?.textContent?.trim() || '',
          imageUrl: imgEl?.src || imgEl?.getAttribute('data-src') || '',
          url: fullUrl,
          location: locationEl?.textContent?.trim() || 'South Africa',
          description: descEl?.textContent?.trim() || '',
        })
      })

      return items
    })

    // Filter for wholesale-related listings only
    const wholesaleItems = rawItems.filter(
      p => isWholesaleListing(p.name + ' ' + p.description) && p.name.length > 2
    )

    return wholesaleItems.slice(0, 20).map((p, i) => {
      const price = parseSAPrice(p.priceText)
      return {
        id: `gumtree-${i}-${Date.now()}`,
        name: p.name,
        price,
        minOrder: 1,
        imageUrl: p.imageUrl,
        url: p.url,
        source: 'gumtree',
        location: p.location,
        category: '',
        deliveryDays: '1-3 business days',
      }
    })
  } catch (e) {
    console.error('Gumtree wholesale search error:', e)
    return []
  } finally {
    await browser.close()
  }
}

export async function searchAll(keyword: string): Promise<SAWholesaleProduct[]> {
  try {
    const [gumtreeResults] = await Promise.all([searchGumtreeWholesale(keyword)])

    const all = [...gumtreeResults]
    const seen = new Set<string>()
    const deduped = all.filter(p => {
      const key = p.name.slice(0, 30).toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return deduped.sort((a, b) => a.price - b.price)
  } catch (e) {
    console.error('SA wholesaler searchAll error:', e)
    return []
  }
}
