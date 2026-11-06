import { supabaseAdmin } from '@/lib/supabase'

/**
 * Checkout inserts a pending order before the customer pays, so abandoned checkouts
 * pile up. Cancel the ones nobody paid for. Only touches orders whose payment is still
 * 'pending' (never 'processing' or 'paid'). If a late PayFast notification does arrive
 * for a cancelled order, the webhook still marks it paid: money received wins.
 */
export async function expireStalePendingOrders(maxAgeHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('payment_status', 'pending')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}
