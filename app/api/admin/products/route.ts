import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/security/guards'
import { intParam, noStore, parseBody, serverError } from '@/lib/http'

const idSchema = z.string().uuid()

// Escape LIKE wildcards so user input is matched literally.
const likeEscape = (s: string) => s.replace(/[\\%_]/g, c => `\\${c}`)

const SUPPLIERS = [
  'aliexpress', 'cj', 'makro', 'takealot', 'game', 'bidorbuy', 'hivve', 'gumtree', 'manual',
] as const

// Allowlist: only these columns can be changed from the admin UI.
const ProductPatch = z
  .object({
    name: z.string().trim().min(1).max(300),
    description: z.string().max(10_000).nullable(),
    ai_description: z.string().max(10_000).nullable(),
    images: z.array(z.string().url().max(2000)).max(20),
    category: z.string().trim().min(1).max(100),
    tags: z.array(z.string().max(50)).max(30),
    selling_price: z.number().positive().max(1_000_000),
    compare_at_price: z.number().positive().max(1_000_000).nullable(),
    cost_price: z.number().min(0).max(1_000_000),
    margin_percent: z.number().min(-1000).max(1000),
    supplier: z.enum(SUPPLIERS),
    stock_status: z.enum(['in_stock', 'out_of_stock', 'low_stock']),
    is_published: z.boolean(),
    seo_title: z.string().max(200).nullable(),
    seo_description: z.string().max(500).nullable(),
    bullet_points: z.array(z.string().max(300)).max(20),
  })
  .partial()
  .strict()

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const sp = req.nextUrl.searchParams
    const page = intParam(sp.get('page'), 1, 1, 10_000)
    const limit = intParam(sp.get('limit'), 50, 1, 100)
    const search = (sp.get('search') || '').slice(0, 100)
    const category = (sp.get('category') || '').slice(0, 100)
    const published = sp.get('published')

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) query = query.ilike('name', `%${likeEscape(search)}%`)
    if (category) query = query.ilike('category', `%${likeEscape(category)}%`)
    if (published === 'true') query = query.eq('is_published', true)
    else if (published === 'false') query = query.eq('is_published', false)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ products: data, total: count }, { headers: noStore })
  } catch (e) {
    return serverError('admin/products GET', e)
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const id = idSchema.safeParse(req.nextUrl.searchParams.get('id'))
    if (!id.success) return NextResponse.json({ error: 'Valid id required' }, { status: 400 })

    const parsed = await parseBody(req, ProductPatch)
    if (!parsed.ok) return parsed.response
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id.data)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json(data)
  } catch (e) {
    return serverError('admin/products PATCH', e)
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const id = idSchema.safeParse(req.nextUrl.searchParams.get('id'))
    if (!id.success) return NextResponse.json({ error: 'Valid id required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id.data)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    return serverError('admin/products DELETE', e)
  }
}
