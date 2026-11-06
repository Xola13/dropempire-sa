import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Returns the signed-in user, verified against the Supabase auth server.
 * `getSession()` only decodes the cookie and must not be trusted for authorization.
 */
export async function getVerifiedUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return error || !user ? null : user
}

export interface CustomerRow {
  id: string
  email: string
  name: string
  phone: string | null
  auth_user_id: string | null
  delivery_address: Record<string, string> | null
  total_orders: number
  total_spent: number
  created_at: string
}

const CUSTOMER_COLUMNS =
  'id, email, name, phone, auth_user_id, delivery_address, total_orders, total_spent, created_at'

/**
 * Finds the customer record for a verified user, linking or creating it when safe.
 *
 * Linking by email is only allowed once the user has *confirmed* that email.
 * Otherwise anyone could register with a victim's address and read the victim's
 * orders or take over their guest-checkout record.
 */
export async function ensureCustomer(
  admin: SupabaseClient,
  user: User
): Promise<CustomerRow | null> {
  const byAuth = await admin
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (byAuth.data) return byAuth.data as CustomerRow

  const email = user.email?.trim().toLowerCase()
  if (!email || !user.email_confirmed_at) return null

  const byEmail = await admin
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('email', email)
    .maybeSingle()

  if (byEmail.data) {
    const existing = byEmail.data as CustomerRow
    if (existing.auth_user_id && existing.auth_user_id !== user.id) return null // owned by someone else
    const { data: linked } = await admin
      .from('customers')
      .update({ auth_user_id: user.id })
      .eq('id', existing.id)
      .is('auth_user_id', null)
      .select(CUSTOMER_COLUMNS)
      .maybeSingle()
    return (linked as CustomerRow | null) ?? existing
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const name = String(meta.full_name ?? meta.name ?? email.split('@')[0]).trim().slice(0, 100)
  const phone = typeof meta.phone === 'string' ? meta.phone.trim().slice(0, 20) || null : null

  const { data: created, error } = await admin
    .from('customers')
    .insert({ email, name: name || 'Customer', phone, auth_user_id: user.id })
    .select(CUSTOMER_COLUMNS)
    .single()

  if (created) return created as CustomerRow
  if (error?.code === '23505') {
    // Concurrent request created it first.
    const { data } = await admin.from('customers').select(CUSTOMER_COLUMNS).eq('email', email).maybeSingle()
    return (data as CustomerRow | null) ?? null
  }
  throw error
}
