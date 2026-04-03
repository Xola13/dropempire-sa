export async function createYocoCharge(params: {
  token: string
  amountInCents: number
  currency: 'ZAR'
  metadata?: Record<string, string>
}) {
  const response = await fetch('https://online.yoco.com/v1/charges/', {
    method: 'POST',
    headers: {
      'X-Auth-Secret-Key': process.env.YOCO_SECRET_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: params.token,
      amountInCents: params.amountInCents,
      currency: params.currency,
      metadata: params.metadata,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Yoco charge failed')
  return data
}
