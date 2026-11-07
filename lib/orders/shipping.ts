// Supplier APIs need a full recipient. Checkout stores only the street address in
// `orders.delivery_address`; name, phone and email live in their own columns.

export interface ShippingAddress {
  name: string
  phone: string
  email: string
  address: string
  city: string
  province: string
  postalCode: string
}

interface OrderLike {
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  delivery_address?: Record<string, string> | null
}

/** Throws when anything a courier needs is missing, so we never place a supplier order we can't deliver. */
export function buildShippingAddress(order: OrderLike): ShippingAddress {
  const a = order.delivery_address ?? {}
  const ship: ShippingAddress = {
    name: (a.name || order.customer_name || '').trim(),
    phone: (a.phone || order.customer_phone || '').trim(),
    email: (a.email || order.customer_email || '').trim(),
    address: (a.address || '').trim(),
    city: (a.city || '').trim(),
    province: (a.province || '').trim(),
    postalCode: (a.postalCode || '').trim(),
  }
  const missing = (Object.keys(ship) as (keyof ShippingAddress)[]).filter(k => !ship[k])
  if (missing.length > 0) throw new Error(`Order is missing shipping details: ${missing.join(', ')}`)
  return ship
}
