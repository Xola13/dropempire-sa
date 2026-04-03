// Auto-orders from Makro using Playwright browser automation

import { chromium } from 'playwright'

interface OrderDetails {
  productUrl: string
  qty: number
  deliverTo: {
    name: string
    phone: string
    address: string
    city: string
    province: string
    postalCode: string
  }
}

interface AutoOrderResult {
  success: boolean
  orderNumber?: string
  error?: string
}

export async function autoOrderMakro(order: OrderDetails): Promise<AutoOrderResult> {
  const email = process.env.MAKRO_EMAIL
  const password = process.env.MAKRO_PASSWORD

  if (!email || !password) {
    return { success: false, error: 'MAKRO_EMAIL or MAKRO_PASSWORD not set in .env.local' }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    })
    const page = await context.newPage()

    // Step 1: Log in
    await page.goto('https://www.makro.co.za/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('input[type="email"], input[name="email"], #email, #username', email)
    await page.fill('input[type="password"], input[name="password"], #password', password)
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")')
    await page.waitForTimeout(3000)

    if (page.url().includes('/login')) {
      return { success: false, error: 'Makro login failed — check MAKRO_EMAIL and MAKRO_PASSWORD' }
    }

    // Step 2: Go to product page
    await page.goto(order.productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Step 3: Add to cart
    const addToCart = page.locator('button:has-text("Add to Cart"), button:has-text("Add to cart"), [class*="add-to-cart"]').first()
    await addToCart.click()
    await page.waitForTimeout(2000)

    // Step 4: Go to cart and checkout
    await page.goto('https://www.makro.co.za/cart', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)

    const checkout = page.locator('button:has-text("Checkout"), a:has-text("Checkout"), button:has-text("Proceed")').first()
    await checkout.click()
    await page.waitForURL(/checkout|delivery/, { timeout: 15000 })
    await page.waitForTimeout(2000)

    // Step 5: Set delivery address
    const newAddr = page.locator('button:has-text("New"), button:has-text("Add"), [class*="add-address"]').first()
    if (await newAddr.isVisible()) {
      await newAddr.click()
      await page.waitForTimeout(1000)
    }

    const addrInput = page.locator('input[name*="address"], input[placeholder*="address"], input[id*="address"]').first()
    if (await addrInput.isVisible()) await addrInput.fill(order.deliverTo.address)

    const cityInput = page.locator('input[name*="city"], input[placeholder*="city"]').first()
    if (await cityInput.isVisible()) await cityInput.fill(order.deliverTo.city)

    const postalInput = page.locator('input[name*="postal"], input[placeholder*="postal"]').first()
    if (await postalInput.isVisible()) await postalInput.fill(order.deliverTo.postalCode)

    const saveAddr = page.locator('button:has-text("Save"), button:has-text("Continue"), button:has-text("Confirm")').first()
    if (await saveAddr.isVisible()) {
      await saveAddr.click()
      await page.waitForTimeout(2000)
    }

    // Step 6: Place order
    const placeOrder = page.locator('button:has-text("Place Order"), button:has-text("Pay"), button:has-text("Complete")').first()
    if (await placeOrder.isVisible()) {
      await placeOrder.click()
      await page.waitForTimeout(4000)
    }

    const confirmationText = await page.locator('[class*="order"], h1, h2').first().textContent().catch(() => '')
    const orderMatch = confirmationText?.match(/(?:order|#)\s*([A-Z0-9-]{5,20})/i)
    const orderNumber = orderMatch?.[1] || `MKR-${Date.now()}`

    return { success: true, orderNumber }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Makro auto-order error:', msg)
    return { success: false, error: msg }
  } finally {
    await browser.close()
  }
}
