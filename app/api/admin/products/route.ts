import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAdminAuth(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session')
  const header = req.headers.get('x-admin-token')
  return cookie?.value === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const search = req.nextUrl.searchParams.get('search') || ''
  const category = req.nextUrl.searchParams.get('category') || ''
  const published = req.nextUrl.searchParams.get('published')

  let query = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (category) {
    query = query.ilike('category', `%${category}%`)
  }
  if (published === 'true') {
    query = query.eq('is_published', true)
  } else if (published === 'false') {
    query = query.eq('is_published', false)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data, total: count })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  const updates = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
