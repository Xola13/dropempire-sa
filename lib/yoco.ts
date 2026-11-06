export interface YocoCharge {
  id: string
  status: string
  amountInCents?: number
}

/** The gateway answered and refused the charge. Definitive: no money moved. */
export class YocoDeclinedError extends Error {
  constructor(public status: number, detail: string) {
    super(`Yoco charge declined (${status}): ${detail}`)
  }
}

export async function createYocoCharge(params: {
  token: string
  amountInCents: number
  currency: 'ZAR'
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<YocoCharge> {
  const secret = process.env.YOCO_SECRET_KEY
  if (!secret) throw new Error('Yoco is not configured')

  const response = await fetch('https://online.yoco.com/v1/charges/', {
    method: 'POST',
    headers: {
      'X-Auth-Secret-Key': secret,
      'Content-Type': 'application/json',
      ...(params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      token: params.token,
      amountInCents: params.amountInCents,
      currency: params.currency,
      metadata: params.metadata,
    }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Preserve the gateway's message for server logs; callers must not echo it to clients.
    throw new YocoDeclinedError(response.status, data?.displayMessage || data?.message || 'unknown')
  }
  return data as YocoCharge
}
