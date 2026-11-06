import { describe, expect, it } from 'vitest'
import { buildShippingAddress } from '@/lib/orders/shipping'

const order = {
  customer_name: 'Thandi Nkosi',
  customer_phone: '0821234567',
  customer_email: 'thandi@example.com',
  // exactly what /api/store/checkout stores
  delivery_address: { address: '1 Main Rd', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' },
}

describe('buildShippingAddress', () => {
  it('takes name, phone and email from the order columns (checkout does not store them in delivery_address)', () => {
    expect(buildShippingAddress(order)).toEqual({
      name: 'Thandi Nkosi',
      phone: '0821234567',
      email: 'thandi@example.com',
      address: '1 Main Rd',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
    })
  })

  it('refuses to build an address a courier cannot deliver to', () => {
    expect(() => buildShippingAddress({ ...order, customer_phone: null })).toThrow(/phone/)
    expect(() => buildShippingAddress({ ...order, delivery_address: {} })).toThrow(/address/)
  })
})
