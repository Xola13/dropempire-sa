import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { generatePaymentForm } from '@/lib/payfast'
import { generateOrderNumber } from '@/lib/utils'
import { fromCents, toCents } from '@/lib/money'
import { getSiteUrl } from '@/lib/site'
import { limitByIp, parseBody, serverError } from '@/lib/http'

const FREE_SHIPPING_THRESHOLD_CENTS = 100_000 // R1000
const FLAT_SHIPPING_CENTS = 9_900 // R99
const MAX_LINE_QTY = 20

// Strip control characters and collapse whitespace in free-text fields.
const text = (min: number, max: number) =>
  z
    .string()
    .transform(s => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(min).max(max))

const CheckoutSchema = z
  .object({
    customerName: text(2, 100),
    customerEmail: z.string().trim().toLowerCase().email().max(254),
    customerPhone: z.string().trim().regex(/^\+?[0-9 ()-]{9,20}$/, 'Invalid phone number'),
    deliveryAddress: z.object({
      address: text(5, 200),
      city: text(2, 80),
      province: text(2, 50),
      postalCode: z.string().trim().regex(/^\d{4}$/, 'Postal code must be 4 digits'),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          qty: z.number().int().min(1).max(MAX_LINE_QTY),
        })
      )
      .min(1)
      .max(50),
    // Yoco is only accepted once NEXT_PUBLIC_YOCO_ENABLED=true (its checkout flow is not built yet).
    paymentMethod: z
      .enum(['payfast', 'yoco'])
      .refine(m => m === 'payfast' || process.env.NEXT_PUBLIC_YOCO_ENABLED === 'true', {
        message: 'This payment method is not available',
      }),
  })
  .strict()

const PRODUCT_COLUMNS =
  'id, name, selling_price, cost_price, supplier, supplier_product_id, supplier_product_url, images, stock_status'

export async function POST(req: NextRequest) {
  try {
    const limited = await limitByIp(req, 'checkout', 10, 60)
    if (limited) return limited

    const parsed = await parseBody(req, CheckoutSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    // Merge duplicate lines so the same product can't dodge the per-line quantity cap.
    const qtyByProduct = new Map<string, number>()
    for (const { productId, qty } of data.items) {
      qtyByProduct.set(productId, (qtyByProduct.get(productId) ?? 0) + qty)
    }
    if ([...qtyByProduct.values()].some(q => q > MAX_LINE_QTY)) {
      return NextResponse.json({ error: `Maximum ${MAX_LINE_QTY} units per product` }, { status: 400 })
    }

    // Prices always come from the database, never from the client.
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select(PRODUCT_COLUMNS)
      .in('id', [...qtyByProduct.keys()])
      .eq('is_published', true)

    if (prodError) throw prodError

    const byId = new Map((products ?? []).map(p => [p.id as string, p]))
    const unavailable: string[] = []
    const orderItems = []

    for (const [productId, qty] of qtyByProduct) {
      const product = byId.get(productId)
      if (!product || product.stock_status === 'out_of_stock') {
        unavailable.push(productId)
        continue
      }
      orderItems.push({
        product_id: product.id,
        name: product.name,
        qty,
        unit_price: product.selling_price,
        supplier_cost: product.cost_price,
        supplier: product.supplier,
        supplier_product_id: product.supplier_product_id,
        supplier_product_url: product.supplier_product_url ?? undefined,
        images: product.images,
      })
    }

    if (unavailable.length > 0) {
      return NextResponse.json(
        { error: 'Some items are no longer available', unavailable },
        { status: 409 }
      )
    }

    const subtotalCents = orderItems.reduce((s, i) => s + toCents(i.unit_price) * i.qty, 0)
    const shippingCents = subtotalCents > FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS
    const totalCents = subtotalCents + shippingCents
    const costCents = orderItems.reduce((s, i) => s + toCents(i.supplier_cost) * i.qty, 0)
    const profitCents = totalCents - costCents - shippingCents

    // Build the payment form first so a misconfigured gateway fails before we write anything.
    const orderId = randomUUID()
    const siteUrl = getSiteUrl()
    let orderNumber = generateOrderNumber()

    const buildPayfast = () =>
      generatePaymentForm({
        id: orderId,
        orderNumber,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        totalCents,
        returnUrl: `${siteUrl}/order-confirmation?order_id=${orderId}`,
        cancelUrl: `${siteUrl}/checkout?cancelled=1`,
        notifyUrl: `${siteUrl}/api/webhooks/payfast`,
      })
    if (data.paymentMethod === 'payfast') buildPayfast()

    // Guest checkout must not overwrite an existing customer's details.
    let customerId: string
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', data.customerEmail)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
    } else {
      const { data: created, error: custError } = await supabaseAdmin
        .from('customers')
        .insert({ email: data.customerEmail, name: data.customerName, phone: data.customerPhone })
        .select('id')
        .single()

      if (created) {
        customerId = created.id
      } else if (custError?.code === '23505') {
        // Lost a race with a concurrent checkout for the same email.
        const { data: raced } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('email', data.customerEmail)
          .single()
        if (!raced) throw custError
        customerId = raced.id
      } else {
        throw custError ?? new Error('Failed to create customer')
      }
    }

    const row = {
      id: orderId,
      customer_id: customerId,
      customer_email: data.customerEmail,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      delivery_address: data.deliveryAddress,
      items: orderItems,
      subtotal: fromCents(subtotalCents),
      shipping_cost: fromCents(shippingCents),
      total: fromCents(totalCents),
      total_cost: fromCents(costCents),
      total_profit: fromCents(profitCents),
      payment_method: data.paymentMethod,
      payment_status: 'pending',
      fulfillment_status: 'unfulfilled',
      status: 'pending',
    }

    // order_number is UNIQUE; retry on the (very unlikely) collision.
    let order: { id: string; order_number: string } | null = null
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      if (attempt > 0) orderNumber = generateOrderNumber()
      const { data: inserted, error } = await supabaseAdmin
        .from('orders')
        .insert({ ...row, order_number: orderNumber })
        .select('id, order_number')
        .single()
      if (inserted) order = inserted
      else if (error?.code !== '23505') throw error ?? new Error('Failed to create order')
    }
    if (!order) throw new Error('Could not allocate a unique order number')

    if (data.paymentMethod === 'payfast') {
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.order_number,
        payfast: buildPayfast(), // rebuilt: the order number may have changed on retry
      })
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
  } catch (e) {
    return serverError('store/checkout', e)
  }
}
