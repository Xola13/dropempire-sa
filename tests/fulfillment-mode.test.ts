import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/agents/auto-order-takealot', () => ({ autoOrderTakealot: vi.fn() }))
vi.mock('@/lib/agents/auto-order-makro', () => ({ autoOrderMakro: vi.fn() }))

import { getFulfillmentMode } from '@/lib/agents/fulfillment-agent'

describe('getFulfillmentMode', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('defaults to manual approval so a missing env var can never auto-spend money', () => {
    vi.stubEnv('FULFILLMENT_MODE', '')
    expect(getFulfillmentMode()).toBe('manual')
    vi.stubEnv('FULFILLMENT_MODE', 'AUTO ')
    expect(getFulfillmentMode()).toBe('manual')
  })

  it('only the exact value "auto" enables automatic ordering', () => {
    vi.stubEnv('FULFILLMENT_MODE', 'auto')
    expect(getFulfillmentMode()).toBe('auto')
  })
})
