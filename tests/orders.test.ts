import { describe, expect, it } from 'vitest'
import { fromCents, toCents } from '@/lib/money'
import { generateOrderNumber } from '@/lib/utils'
import { toPublicOrder } from '@/lib/orders/public'

describe('money', () => {
  it('avoids float drift', () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30)
    expect(toCents('19.99')).toBe(1999)
    expect(0.1 * 3).not.toBe(0.3) // plain float math drifts (0.30000000000000004)...
    expect(toCents(0.1 * 3)).toBe(30) // ...cents do not
    expect(fromCents(123456)).toBe(1234.56)
  })

  it('rejects non-numeric input', () => {
    expect(() => toCents('abc')).toThrow()
    expect(() => toCents(NaN)).toThrow()
  })
})

describe('generateOrderNumber', () => {
  it('has the expected shape and no ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateOrderNumber()).toMatch(/^ORD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    }
  })

  it('does not collide at realistic volumes (the old 5-digit scheme collided within ~300 orders)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 50_000; i++) seen.add(generateOrderNumber())
    expect(seen.size).toBe(50_000)
  })
})

describe('toPublicOrder', () => {
  const raw = {
    id: 'o1',
    order_number: 'ORD-ABCD2345',
    status: 'paid',
    payment_status: 'paid',
    fulfillment_status: 'unfulfilled',
    subtotal: 100,
    shipping_cost: 99,
    total: 199,
    total_cost: 40,
    total_profit: 60,
    customer_email: 'jo@example.com',
    customer_phone: '0821234567',
    customer_name: 'Jo',
    payment_reference: 'pf-123',
    created_at: '2026-01-01',
    delivery_address: { address: '1 Secret St', city: 'Cape Town', province: 'WC', postalCode: '8001' },
    items: [
      { product_id: 'p1', name: 'Lamp', qty: 2, unit_price: 50, supplier_cost: 20, supplier: 'aliexpress', supplier_product_id: 'AE1', images: ['https://img/1.jpg'] },
    ],
  }

  it('strips internal economics, supplier details and contact PII', () => {
    const json = JSON.stringify(toPublicOrder(raw))
    for (const secret of ['total_cost', 'total_profit', 'supplier_cost', 'aliexpress', 'AE1', 'customer_phone', 'customer_email', 'jo@example.com', 'payment_reference', '1 Secret St']) {
      expect(json).not.toContain(secret)
    }
  })

  it('keeps what a customer needs', () => {
    const pub = toPublicOrder(raw)
    expect(pub.order_number).toBe('ORD-ABCD2345')
    expect(pub.total).toBe(199)
    expect(pub.items).toEqual([
      { product_id: 'p1', name: 'Lamp', qty: 2, unit_price: 50, image: 'https://img/1.jpg' },
    ])
    expect(pub.delivery_address.city).toBe('Cape Town')
  })

  it('gives the signed-in owner their full address', () => {
    expect(toPublicOrder(raw, { fullAddress: true }).delivery_address).toMatchObject({ address: '1 Secret St' })
  })
})
