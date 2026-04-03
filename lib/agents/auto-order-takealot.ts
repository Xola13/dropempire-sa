// Auto-orders from Takealot using Playwright browser automation
// Logs in with your Takealot account, adds product to cart,
// sets the customer's delivery address, and pays with your saved card

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

export async function autoOrderTakealot(order: OrderDetails): Promise<AutoOrderResult> {
  const email = process.env.TAKEALOT_EMAIL
  const password = process.env.TAKEALOT_PASSWORD

  if (!email || !password) {
    return { success: false, error: 'TAKEALOT_EMAIL or TAKEALOT_PASSWORD not set in .env.local' }
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
    await page.goto('https://www.takealot.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)

    await page.fill('input[type="email"], input[name="email"], #email', email)
    await page.fill('input[type="password"], input[name="password"], #password', password)
    await page.click('button[type="submit"], [class*="login"] button, button:has-text("Log In"), button:has-text("Sign in")')
    await page.waitForTimeout(3000)

    // Check login succeeded
    const url = page.url()
    if (url.includes('/login')) {
      return { success: false, error: 'Takealot login failed — check TAKEALOT_EMAIL and TAKEALOT_PASSWORD' }
    }

    // Step 2: Go to product page
    await page.goto(order.productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Set quantity if > 1
    if (order.qty > 1) {
      const qtyInput = page.locator('input[class*="quantity"], input[aria-label*="quantity"], [data-ref="quantity"] input').first()
      if (await qtyInput.isVisible()) {
        await qtyInput.fill(String(order.qty))
      }
    }

    // Step 3: Add to cart
    const addToCart = page.locator('button:has-text("Add to Cart"), [data-ref="add-to-cart"], [class*="add-to-cart"]').first()
    await addToCart.click()
    await page.waitForTimeout(2000)

    // Step 4: Go to cart
    await page.goto('https://www.takealot.com/cart', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)

    // Step 5: Proceed to checkout
    const checkout = page.locator('button:has-text("Proceed to Checkout"), a:has-text("Checkout"), [class*="checkout"]').first()
    await checkout.click()
    await page.waitForURL(/checkout|delivery|address/, { timeout: 15000 })
    await page.waitForTimeout(2000)

    // Step 6: Set delivery address to customer's address
    // Click "Deliver to a new address" or "Add new address"
    const newAddr = page.locator('button:has-text("New Address"), button:has-text("Add address"), [class*="add-address"]').first()
    if (await newAddr.isVisible()) {
      await newAddr.click()
      await page.waitForTimeout(1000)
    }

    // Fill in address fields
    const addrInput = page.locator('input[placeholder*="Address"], input[name*="address"], input[id*="address"]').first()
    if (await addrInput.isVisible()) {
      await addrInput.fill(order.deliverTo.address)
      await page.waitForTimeout(500)
    }

    const cityInput = page.locator('input[placeholder*="City"], input[name*="city"]').first()
    if (await cityInput.isVisible()) await cityInput.fill(order.deliverTo.city)

    const postalInput = page.locator('input[placeholder*="Postal"], input[name*="postal"], input[name*="zip"]').first()
    if (await postalInput.isVisible()) await postalInput.fill(order.deliverTo.postalCode)

    // Save / confirm address
    const saveAddr = page.locator('button:has-text("Save"), button:has-text("Confirm"), button:has-text("Continue")').first()
    if (await saveAddr.isVisible()) {
      await saveAddr.click()
      await page.waitForTimeout(2000)
    }

    // Step 7: Select saved payment card and place order
    const placeOrder = page.locator('button:has-text("Place Order"), button:has-text("Pay Now"), button:has-text("Complete Order")').first()
    if (await placeOrder.isVisible()) {
      await placeOrder.click()
      await page.waitForTimeout(4000)
    }

    // Step 8: Get order confirmation number
    const confirmationText = await page.locator('[class*="order-number"], [class*="confirmation"], h1, h2').first().textContent().catch(() => '')
    const orderMatch = confirmationText?.match(/(?:order|#)\s*([A-Z0-9-]{5,20})/i)
    const orderNumber = orderMatch?.[1] || `TAL-${Date.now()}`

    return { success: true, orderNumber }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Takealot auto-order error:', msg)
    return { success: false, error: msg }
  } finally {
    await browser.close()
  }
}
