import { NextRequest, NextResponse } from 'next/server'
import * as aliexpress from '@/lib/suppliers/aliexpress'
import * as cj from '@/lib/suppliers/cj-dropshipping'

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('q') || ''
  const supplier = req.nextUrl.searchParams.get('supplier') || 'all'

  if (!keyword) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 })
  }

  const results: unknown[] = []

  if (supplier === 'all' || supplier === 'aliexpress') {
    try {
      const data = await aliexpress.searchProducts(keyword)
      const items =
        data?.aliexpress_ds_product_search_response?.result?.products
          ?.product || []
      results.push(
        ...items.slice(0, 10).map((p: Record<string, unknown>) => ({
          ...p,
          _supplier: 'aliexpress',
        }))
      )
    } catch (e) {
      console.error('AliExpress error', e)
    }
  }

  if (supplier === 'all' || supplier === 'cj') {
    try {
      const data = await cj.searchProducts(keyword)
      const items = data?.data?.list || []
      results.push(
        ...items.slice(0, 10).map((p: Record<string, unknown>) => ({
          ...p,
          _supplier: 'cj',
        }))
      )
    } catch (e) {
      console.error('CJ error', e)
    }
  }

  return NextResponse.json({ results })
}
