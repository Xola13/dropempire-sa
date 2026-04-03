import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET — fetch authenticated customer profile
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Find customer by auth_user_id or email
    const { data: customer } = await admin
      .from('customers')
      .select('*')
      .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
      .maybeSingle()

    return NextResponse.json({ customer: customer || null })
  } catch (err) {
    console.error('[account/profile GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create customer record (called after signup)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authUserId, email, name, phone } = body

    if (!authUserId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    // Upsert customer record
    const { data: customer, error } = await admin
      .from('customers')
      .upsert(
        {
          email: email.toLowerCase(),
          name,
          phone: phone || null,
          auth_user_id: authUserId,
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[account/profile POST] upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (err) {
    console.error('[account/profile POST] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update customer profile
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, delivery_address } = body

    const admin = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (phone !== undefined) updates.phone = phone || null
    if (delivery_address !== undefined) updates.delivery_address = delivery_address

    const { data: customer, error } = await admin
      .from('customers')
      .update(updates)
      .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ customer })
  } catch (err) {
    console.error('[account/profile PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — delete customer account
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Soft-delete: nullify auth_user_id and anonymise personal data
    await admin
      .from('customers')
      .update({
        auth_user_id: null,
        phone: null,
        delivery_address: null,
        name: 'Deleted User',
      })
      .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)

    // Delete auth user via Supabase admin API
    const { error: deleteError } = await admin.auth.admin.deleteUser(session.user.id)
    if (deleteError) {
      console.error('[account/profile DELETE] auth delete error:', deleteError)
      // Non-fatal — customer record already anonymised
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/profile DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
