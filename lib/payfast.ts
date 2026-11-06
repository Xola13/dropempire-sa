import md5 from 'md5'
import { safeEqual } from '@/lib/security/crypto'
import { fromCents } from '@/lib/money'

function payfastHost(): string {
  return process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true'
    ? 'sandbox.payfast.co.za'
    : 'www.payfast.co.za'
}

// PayFast signs with PHP's urlencode(): uppercase hex, space as '+', and it also
// escapes the characters encodeURIComponent leaves alone.
function phpUrlencode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}

/**
 * Builds the PayFast parameter string. Order matters: PayFast signs fields in the
 * order they are submitted/received, NOT alphabetically.
 *  - checkout form: empty values are omitted
 *  - ITN: every received field (except `signature`) is included, empties too
 */
export function buildParamString(
  params: Record<string, string>,
  passphrase?: string,
  opts: { skipEmpty: boolean } = { skipEmpty: true }
): string {
  const parts = Object.entries(params)
    .filter(([k, v]) => k !== 'signature' && (!opts.skipEmpty || v !== ''))
    .map(([k, v]) => `${k}=${phpUrlencode(v.trim())}`)
  let str = parts.join('&')
  if (passphrase) str += `&passphrase=${phpUrlencode(passphrase.trim())}`
  return str
}

export function generateSignature(
  params: Record<string, string>,
  passphrase?: string,
  opts?: { skipEmpty: boolean }
): string {
  return md5(buildParamString(params, passphrase, opts))
}

export function generatePaymentForm(order: {
  id: string
  orderNumber: string
  customerEmail: string
  customerName: string
  totalCents: number
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
}): { action: string; params: Record<string, string> } {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  if (!merchantId || !merchantKey) throw new Error('PayFast is not configured')

  const [first, ...rest] = order.customerName.trim().split(/\s+/)

  // Insertion order below is the order PayFast documents; it is what gets signed.
  const params: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: order.returnUrl,
    cancel_url: order.cancelUrl,
    notify_url: order.notifyUrl,
    name_first: (first || order.customerName).slice(0, 100),
    name_last: rest.join(' ').slice(0, 100),
    email_address: order.customerEmail,
    m_payment_id: order.id,
    amount: fromCents(order.totalCents).toFixed(2),
    item_name: order.orderNumber.slice(0, 100),
    item_description: `DropEmpire SA Order ${order.orderNumber}`.slice(0, 255),
  }

  params.signature = generateSignature(params, process.env.PAYFAST_PASSPHRASE)

  return { action: `https://${payfastHost()}/eng/process`, params }
}

/** Step 1 of ITN validation: the signature matches. Says nothing about payment status. */
export async function verifyITNSignature(params: Record<string, string>): Promise<boolean> {
  const received = params.signature
  if (!received) return false
  const expected = generateSignature(params, process.env.PAYFAST_PASSPHRASE, { skipEmpty: false })
  return safeEqual(received.toLowerCase(), expected)
}

/** Step 2: confirm with PayFast's servers that this notification really came from them. */
export async function confirmITNWithPayFast(params: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(`https://${payfastHost()}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildParamString(params, undefined, { skipEmpty: false }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    return (await res.text()).trim() === 'VALID'
  } catch {
    return false
  }
}
