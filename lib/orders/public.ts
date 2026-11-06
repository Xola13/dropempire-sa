// Customers must never see internal economics (supplier cost, profit) or
// supplier identifiers. Everything returned to a customer goes through here.

interface RawItem {
  product_id?: string
  name?: string
  qty?: number
  unit_price?: number
  images?: string[]
}

export interface PublicOrderItem {
  product_id?: string
  name: string
  qty: number
  unit_price: number
  image?: string
}

export const PUBLIC_ORDER_COLUMNS =
  'id, order_number, status, payment_status, fulfillment_status, subtotal, shipping_cost, total, ' +
  'tracking_number, tracking_url, courier, estimated_delivery, created_at, items, customer_name, delivery_address'

export function toPublicItems(items: unknown): PublicOrderItem[] {
  if (!Array.isArray(items)) return []
  return (items as RawItem[]).map(i => ({
    product_id: i.product_id,
    name: String(i.name ?? ''),
    qty: Number(i.qty ?? 0),
    unit_price: Number(i.unit_price ?? 0),
    image: Array.isArray(i.images) ? i.images[0] : undefined,
  }))
}

export function toPublicOrder<T extends Record<string, unknown>>(
  order: T,
  opts: { fullAddress?: boolean } = {}
) {
  const address = (order.delivery_address ?? {}) as Record<string, string>
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    total: order.total,
    tracking_number: order.tracking_number ?? null,
    tracking_url: order.tracking_url ?? null,
    courier: order.courier ?? null,
    estimated_delivery: order.estimated_delivery ?? null,
    created_at: order.created_at,
    customer_name: order.customer_name,
    // Anonymous lookups (order id + email) only get city/province; the signed-in owner gets everything.
    delivery_address: opts.fullAddress
      ? address
      : { city: address.city, province: address.province, postalCode: address.postalCode },
    items: toPublicItems(order.items),
  }
}
