import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ensureCustomer, getVerifiedUser } from '@/lib/account'
import { forbiddenOrigin, isSameOrigin } from '@/lib/security/guards'
import { limitByIp, noStore, parseBody, serverError } from '@/lib/http'

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()

const PatchSchema = z
  .object({
    name: z.string().transform(clean).pipe(z.string().min(2).max(100)),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{9,20}$/, 'Invalid phone number')
      .nullable()
      .or(z.literal('').transform(() => null)),
    delivery_address: z
      .object({
        address: z.string().transform(clean).pipe(z.string().min(5).max(200)),
        city: z.string().transform(clean).pipe(z.string().min(2).max(80)),
        province: z.string().transform(clean).pipe(z.string().min(2).max(50)),
        postalCode: z.string().trim().regex(/^\d{4}$/),
      })
      .nullable(),
  })
  .partial()
  .strict()

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// GET — the signed-in customer's profile (links/creates the record once the email is verified)
export async function GET() {
  try {
    const user = await getVerifiedUser()
    if (!user) return unauthorized()

    const customer = await ensureCustomer(getSupabaseAdmin(), user)
    return NextResponse.json({ customer }, { headers: noStore })
  } catch (e) {
    return serverError('account/profile GET', e)
  }
}

// POST — kept for the signup flow. Identity comes from the verified session only;
// nothing in the body (authUserId, email) is trusted.
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin()
    const limited = await limitByIp(req, 'account-profile', 20, 60)
    if (limited) return limited

    const user = await getVerifiedUser()
    if (!user) return unauthorized()

    const customer = await ensureCustomer(getSupabaseAdmin(), user)
    if (!customer) {
      // Email not yet verified: nothing is linked until it is.
      return NextResponse.json({ customer: null, pendingVerification: true }, { status: 202 })
    }
    return NextResponse.json({ customer }, { status: 201 })
  } catch (e) {
    return serverError('account/profile POST', e)
  }
}

// PATCH — update the signed-in customer's own profile
export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin()
    const user = await getVerifiedUser()
    if (!user) return unauthorized()

    const parsed = await parseBody(req, PatchSchema)
    if (!parsed.ok) return parsed.response
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const customer = await ensureCustomer(admin, user)
    if (!customer) {
      return NextResponse.json({ error: 'Please verify your email first' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('customers')
      .update(parsed.data)
      .eq('id', customer.id)
      .eq('auth_user_id', user.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ customer: data })
  } catch (e) {
    return serverError('account/profile PATCH', e)
  }
}

// DELETE — anonymise the customer record and delete the auth user
export async function DELETE(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin()
    const user = await getVerifiedUser()
    if (!user) return unauthorized()

    const admin = getSupabaseAdmin()

    // Order history is retained for accounting; personal profile data is removed.
    const { error: anonError } = await admin
      .from('customers')
      .update({ auth_user_id: null, phone: null, delivery_address: null, name: 'Deleted User' })
      .eq('auth_user_id', user.id)
    if (anonError) throw anonError

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError('account/profile DELETE', e)
  }
}
