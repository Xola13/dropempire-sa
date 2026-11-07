import { describe, expect, it } from 'vitest'
import { checkEnv } from '@/lib/env-check'

const good: Record<string, string | undefined> = {
  NEXT_PUBLIC_SITE_URL: 'https://shop.example.co.za',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a',
  SUPABASE_SERVICE_ROLE_KEY: 's',
  ADMIN_SECRET: 'x'.repeat(32),
  CRON_SECRET: 'y'.repeat(32),
  PAYFAST_MERCHANT_ID: '12345678',
  PAYFAST_MERCHANT_KEY: 'k',
  PAYFAST_PASSPHRASE: 'p',
  RESEND_API_KEY: 're_x',
  ANTHROPIC_API_KEY: 'sk',
  OWNER_EMAIL: 'me@example.co.za',
  SELLER_LEGAL_NAME: 'Acme (Pty) Ltd',
  SELLER_ADDRESS: '1 Main Rd, Johannesburg',
  SELLER_EMAIL: 'support@example.co.za',
  SELLER_INFORMATION_OFFICER: 'Jane Doe',
  UPSTASH_REDIS_REST_URL: 'https://r',
  UPSTASH_REDIS_REST_TOKEN: 't',
  FROM_EMAIL: 'orders@example.co.za',
}

describe('checkEnv', () => {
  it('passes a complete production config', () => {
    const r = checkEnv(good)
    expect(r.blockers).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.ready).toBe(true)
  })

  it('blocks going live on PayFast sandbox or the public sandbox merchant', () => {
    const r = checkEnv({ ...good, NEXT_PUBLIC_PAYFAST_SANDBOX: 'true', PAYFAST_MERCHANT_ID: '10000100' })
    expect(r.ready).toBe(false)
    expect(r.blockers.join('\n')).toMatch(/SANDBOX/)
    expect(r.blockers.join('\n')).toMatch(/10000100/)
  })

  it('blocks weak or missing secrets and a placeholder database URL, without echoing values', () => {
    const r = checkEnv({ ...good, ADMIN_SECRET: 'hunter2', CRON_SECRET: '', NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co' })
    const text = r.blockers.join('\n')
    expect(text).toMatch(/ADMIN_SECRET/)
    expect(text).toMatch(/CRON_SECRET/)
    expect(text).toMatch(/placeholder/)
    expect(text).not.toContain('hunter2')
  })

  it('warns about missing Redis and auto fulfilment', () => {
    const r = checkEnv({ ...good, UPSTASH_REDIS_REST_URL: '', FULFILLMENT_MODE: 'auto' })
    expect(r.warnings.join('\n')).toMatch(/UPSTASH/)
    expect(r.warnings.join('\n')).toMatch(/FULFILLMENT_MODE=auto/)
  })
})
