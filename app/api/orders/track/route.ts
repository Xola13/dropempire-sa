import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { safeEqual } from '@/lib/security/crypto'
import { limitByIp, noStore, serverError } from '@/lib/http'
import { PUBLIC_ORDER_COLUMNS, toPublicOrder } from '@/lib/orders/public'

const QuerySchema = z.object({
  // Either the order UUID or the human-readable order number.
  order: z.union([
    z.string().uuid(),
    z.string().regex(/^ORD-[A-Z0-9]{4,12}$/i, 'Invalid order number'),
  ]),
  email: z.string().trim().toLowerCase().email().max(254),
})

// One response for "no such order" and "wrong email" so this can't be used to
// discover which orders or emails exist.
const notFound = () => NextResponse.json({ error: 'Order not found' }, { status: 404 })

export async function GET(req: NextRequest) {
  try {
    // Tight limit: this is an unauthenticated lookup that could be enumerated.
    const limited = await limitByIp(req, 'order-track', 15, 60)
    if (limited) return limited

    const parsed = QuerySchema.safeParse({
      order: req.nextUrl.searchParams.get('order') ?? req.nextUrl.searchParams.get('order_id'),
      email: req.nextUrl.searchParams.get('email'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Order number and email are required' }, { status: 400 })
    }
    const { order: ref, email } = parsed.data

    const isUuid = z.string().uuid().safeParse(ref).success
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`${PUBLIC_ORDER_COLUMNS}, customer_email`)
      .eq(isUuid ? 'id' : 'order_number', isUuid ? ref : ref.toUpperCase())
      .maybeSingle()
    if (error) throw error
    if (!order) return notFound()

    const row = order as unknown as Record<string, unknown>
    if (!(await safeEqual(String(row.customer_email).toLowerCase(), email))) return notFound()

    return NextResponse.json({ order: toPublicOrder(row) }, { headers: noStore })
  } catch (e) {
    return serverError('orders/track', e)
  }
}
