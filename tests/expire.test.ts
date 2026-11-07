import { describe, expect, it, vi } from 'vitest'

const calls: Array<[string, ...unknown[]]> = []
const chain: Record<string, unknown> = {}
for (const m of ['update', 'eq', 'lt']) {
  chain[m] = (...a: unknown[]) => {
    calls.push([m, ...a])
    return chain
  }
}
chain.select = async () => ({ data: [{ id: 'a' }, { id: 'b' }], error: null })

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain } }))

import { expireStalePendingOrders } from '@/lib/orders/expire'

describe('expireStalePendingOrders', () => {
  it('only touches unpaid pending orders and reports how many it cancelled', async () => {
    const n = await expireStalePendingOrders(24)
    expect(n).toBe(2)
    const filters = calls.filter(c => c[0] === 'eq').map(c => `${c[1]}=${c[2]}`)
    expect(filters).toContain('payment_status=pending')
    expect(filters).toContain('status=pending')
    expect(calls.some(c => c[0] === 'lt' && c[1] === 'created_at')).toBe(true)
  })
})
