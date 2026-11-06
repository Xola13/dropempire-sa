// Money is handled in integer cents internally to avoid float drift
// (e.g. 0.1 + 0.2). Convert only at the edges (DB numeric columns, gateways).

export function toCents(amount: number | string): number {
  const n = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${amount}`)
  return Math.round(n * 100)
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}
