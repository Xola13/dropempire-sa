import { missingSellerDetails } from '@/lib/seller'

type Env = Record<string, string | undefined>

export interface EnvReport {
  ready: boolean
  /** Things that must be fixed before taking real money. Names only, never values. */
  blockers: string[]
  /** Things that should be fixed but do not stop the store working. */
  warnings: string[]
}

const has = (env: Env, key: string, minLength = 1) => (env[key] ?? '').trim().length >= minLength

// PayFast's public sandbox merchant. Using it in production means payments go nowhere.
const PAYFAST_SANDBOX_MERCHANT_ID = '10000100'

/** Reads the environment and reports what is missing or unsafe for production. Pure, so it is testable. */
export function checkEnv(env: Env = process.env): EnvReport {
  const blockers: string[] = []
  const warnings: string[] = []

  const required: [string, number][] = [
    ['NEXT_PUBLIC_SITE_URL', 1],
    ['NEXT_PUBLIC_SUPABASE_URL', 1],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 1],
    ['SUPABASE_SERVICE_ROLE_KEY', 1],
    ['ADMIN_SECRET', 16],
    ['CRON_SECRET', 16],
    ['PAYFAST_MERCHANT_ID', 1],
    ['PAYFAST_MERCHANT_KEY', 1],
    ['PAYFAST_PASSPHRASE', 1],
    ['RESEND_API_KEY', 1],
    ['ANTHROPIC_API_KEY', 1],
  ]
  for (const [key, min] of required) {
    if (!has(env, key, min)) blockers.push(`${key} is missing${min > 1 ? ` or shorter than ${min} characters` : ''}`)
  }

  if (!has(env, 'OWNER_EMAIL') && !has(env, 'ADMIN_EMAIL')) {
    blockers.push('OWNER_EMAIL (or ADMIN_EMAIL) is missing: approval and failure alerts have nowhere to go')
  }

  if (env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true') {
    blockers.push('NEXT_PUBLIC_PAYFAST_SANDBOX is true: payments go to the PayFast sandbox')
  }
  if (env.PAYFAST_MERCHANT_ID === PAYFAST_SANDBOX_MERCHANT_ID) {
    blockers.push('PAYFAST_MERCHANT_ID is the public sandbox merchant (10000100)')
  }
  if ((env.NEXT_PUBLIC_SUPABASE_URL ?? '').includes('placeholder')) {
    blockers.push('NEXT_PUBLIC_SUPABASE_URL is a placeholder')
  }

  for (const key of missingSellerDetails(env)) {
    blockers.push(`${key} is not set: the legal pages still show "to be completed" notices`)
  }

  if (!has(env, 'UPSTASH_REDIS_REST_URL') || !has(env, 'UPSTASH_REDIS_REST_TOKEN')) {
    warnings.push('UPSTASH_REDIS_REST_URL/TOKEN not set: rate limits only apply per server instance and are easy to bypass')
  }
  if (env.FULFILLMENT_MODE === 'auto') {
    warnings.push('FULFILLMENT_MODE=auto: paid orders are bought from suppliers without your approval')
  }
  if (env.NEXT_PUBLIC_YOCO_ENABLED === 'true' && !has(env, 'YOCO_SECRET_KEY')) {
    blockers.push('NEXT_PUBLIC_YOCO_ENABLED is true but YOCO_SECRET_KEY is missing')
  }
  if (!has(env, 'FROM_EMAIL')) {
    warnings.push('FROM_EMAIL not set: emails are sent from orders@<your site host>; make sure that domain is verified in Resend')
  }

  return { ready: blockers.length === 0, blockers, warnings }
}
