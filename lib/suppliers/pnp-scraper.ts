import { chromium } from 'playwright'

export interface PnPProduct {
  id: string
  name: string
  price: number
  originalPrice: number | null
  imageUrl: string
  url: string
  category: string
  inStock: boolean
}

function parseSAPrice(text: string): number {
  const match = text.match(/R?\s*[\d\s]+[.,]\d{2}|R?\s*\d+/)
  if (!match) return 0
  const clean = match[0]
    .replace(/R/gi, '')
    .replace(/\s/g, '')
    .replace(/,(\d{2})$/, '.$1')
    .replace(/,/g, '')
  const price = parseFloat(clean)
  return price > 0 && price < 100000 ? price : 0
}

export async function searchProducts(query: string): Promise<PnPProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    const searchUrl = `https://www.pnp.co.za/pnpstorefront/pnp/en/search/?q=${encodeURIComponent(query)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector(
      '[class*="product"], article, .product-tile, .product-item',
      { timeout: 10000 }
    ).catch(() => {})
    await page.waitForTimeout(2000)

    const products = await page.evaluate((): PnPProduct[] => {
      const items: PnPProduct[] = []

      const cards = Array.from(
        document.querySelectorAll(
          '.product-tile, [class*="product-tile"], [class*="ProductTile"], .product-grid-item, [class*="product-item"], article.product, li.product'
        )
      )

      cards.forEach((el, i) => {
        if (i >= 20) return

        const nameEl = el.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], h3, h4, h2, .product-name')
        const priceEl = el.querySelector('[class*="price"], [class*="Price"], .price-value, .selling-price')
        const originalPriceEl = el.querySelector('[class*="original"], [class*="was"], [class*="strikethrough"], s, del, .was-price')
        const imgEl = el.querySelector('img') as HTMLImageElement | null
        const linkEl = el.querySelector('a') as HTMLAnchorElement | null

        if (!nameEl || !priceEl) return

        const rawPrice = priceEl.textContent || '0'
        const priceMatch = rawPrice.match(/R?\s*[\d\s]+[.,]\d{2}|R?\s*\d+/)
        if (!priceMatch) return
        const priceClean = priceMatch[0]
          .replace(/R/gi, '')
          .replace(/\s/g, '')
          .replace(/,(\d{2})$/, '.$1')
          .replace(/,/g, '')
        const price = parseFloat(priceClean)
        if (!price || price < 1 || price > 100000) return

        const rawOriginal = originalPriceEl?.textContent || ''
        const origMatch = rawOriginal.match(/R?\s*[\d\s]+[.,]\d{2}|R?\s*\d+/)
        const origClean = origMatch
          ? origMatch[0].replace(/R/gi, '').replace(/\s/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
          : ''
        const originalPrice = origClean ? parseFloat(origClean) : null

        const href = linkEl?.href || ''
        const fullUrl = href.startsWith('http') ? href : `https://www.pnp.co.za${href}`

        const textContent = el.textContent?.toLowerCase() || ''
        const inStock = !textContent.includes('out of stock') && !textContent.includes('unavailable')

        items.push({
          id: `pnp-${i}-${Date.now()}`,
          name: nameEl.textContent?.trim() || '',
          price,
          originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
          imageUrl: imgEl?.src || imgEl?.getAttribute('data-src') || '',
          url: fullUrl,
          category: '',
          inStock,
        })
      })

      return items
    })

    return products.filter(p => p.price > 0 && p.name.length > 2).slice(0, 20)
  } catch (e) {
    console.error('PnP search error:', e)
    return []
  } finally {
    await browser.close()
  }
}

export async function getSpecials(): Promise<PnPProduct[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    // PnP specials / on-promotion listing
    await page.goto(
      'https://www.pnp.co.za/pnpstorefront/pnp/en/Specials/c/specials',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    )
    await page.waitForSelector(
      '.product-tile, [class*="product-tile"], [class*="product-item"], article.product',
      { timeout: 10000 }
    ).catch(() => {})
    await page.waitForTimeout(2000)

    const products = await page.evaluate((): PnPProduct[] => {
      const items: PnPProduct[] = []

      const cards = Array.from(
        document.querySelectorAll(
          '.product-tile, [class*="product-tile"], [class*="ProductTile"], .product-grid-item, [class*="product-item"], article.product, li.product'
        )
      )

      cards.forEach((el, i) => {
        if (i >= 20) return

        const nameEl = el.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], h3, h4, h2, .product-name')
        const priceEl = el.querySelector('[class*="price"], [class*="Price"], .price-value, .selling-price')
        const originalPriceEl = el.querySelector('[class*="original"], [class*="was"], [class*="strikethrough"], s, del, .was-price')
        const imgEl = el.querySelector('img') as HTMLImageElement | null
        const linkEl = el.querySelector('a') as HTMLAnchorElement | null

        if (!nameEl || !priceEl) return

        const rawPrice = priceEl.textContent || '0'
        const priceMatch = rawPrice.match(/R?\s*[\d\s]+[.,]\d{2}|R?\s*\d+/)
        if (!priceMatch) return
        const priceClean = priceMatch[0]
          .replace(/R/gi, '')
          .replace(/\s/g, '')
          .replace(/,(\d{2})$/, '.$1')
          .replace(/,/g, '')
        const price = parseFloat(priceClean)
        if (!price || price < 1 || price > 100000) return

        const rawOriginal = originalPriceEl?.textContent || ''
        const origMatch = rawOriginal.match(/R?\s*[\d\s]+[.,]\d{2}|R?\s*\d+/)
        const origClean = origMatch
          ? origMatch[0].replace(/R/gi, '').replace(/\s/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, '')
          : ''
        const originalPrice = origClean ? parseFloat(origClean) : null

        const href = linkEl?.href || ''
        const fullUrl = href.startsWith('http') ? href : `https://www.pnp.co.za${href}`

        const textContent = el.textContent?.toLowerCase() || ''
        const inStock = !textContent.includes('out of stock') && !textContent.includes('unavailable')

        items.push({
          id: `pnp-special-${i}-${Date.now()}`,
          name: nameEl.textContent?.trim() || '',
          price,
          originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
          imageUrl: imgEl?.src || imgEl?.getAttribute('data-src') || '',
          url: fullUrl,
          category: '',
          inStock,
        })
      })

      return items
    })

    return products.filter(p => p.price > 0 && p.name.length > 2).slice(0, 20)
  } catch (e) {
    console.error('PnP specials error:', e)
    return []
  } finally {
    await browser.close()
  }
}
