import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import md5 from 'md5'
import {
  buildParamString,
  generatePaymentForm,
  generateSignature,
  verifyITNSignature,
} from '@/lib/payfast'

const ENV = { ...process.env }

beforeEach(() => {
  process.env.PAYFAST_MERCHANT_ID = '10000100'
  process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a'
  process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn'
})
afterEach(() => {
  process.env = { ...ENV }
})

describe('PayFast signature', () => {
  it('signs fields in submission order, not alphabetically', () => {
    const a = generateSignature({ merchant_id: '1', amount: '10.00' })
    const b = generateSignature({ amount: '10.00', merchant_id: '1' })
    expect(a).toBe(md5('merchant_id=1&amount=10.00'))
    expect(a).not.toBe(b)
  })

  it('encodes like PHP urlencode (space as +, and !\'()*~ escaped)', () => {
    const str = buildParamString({ item_name: "a b!'()*~&c" })
    expect(str).toBe('item_name=a+b%21%27%28%29%2A%7E%26c')
  })

  it('appends the passphrase and omits empty values for checkout forms', () => {
    const str = buildParamString({ a: '1', b: '', c: '3' }, 'secret')
    expect(str).toBe('a=1&c=3&passphrase=secret')
  })

  it('keeps empty values for ITN verification', () => {
    const str = buildParamString({ a: '1', b: '', c: '3' }, undefined, { skipEmpty: false })
    expect(str).toBe('a=1&b=&c=3')
  })

  it('never includes the signature field itself', () => {
    expect(buildParamString({ a: '1', signature: 'zzz' })).toBe('a=1')
  })
})

describe('PayFast checkout form', () => {
  const order = {
    id: '3f1c2b34-6c1f-4f4d-9a43-6f3b1c2d4e5f',
    orderNumber: 'ORD-ABCD2345',
    customerEmail: 'jo@example.com',
    customerName: 'Jo van der Merwe',
    totalCents: 123456,
    returnUrl: 'https://shop.test/return',
    cancelUrl: 'https://shop.test/cancel',
    notifyUrl: 'https://shop.test/notify',
  }

  it('formats the amount from integer cents', () => {
    expect(generatePaymentForm(order).params.amount).toBe('1234.56')
  })

  it('splits the name and produces a verifiable signature', async () => {
    const { params } = generatePaymentForm(order)
    expect(params.name_first).toBe('Jo')
    expect(params.name_last).toBe('van der Merwe')

    // The ITN PayFast sends back is signed with empties included; this form has none.
    expect(await verifyITNSignature(params)).toBe(true)
  })

  it('refuses to build a form when the gateway is not configured', () => {
    delete process.env.PAYFAST_MERCHANT_ID
    expect(() => generatePaymentForm(order)).toThrow(/not configured/)
  })
})

describe('ITN verification', () => {
  it('accepts a correctly signed notification (empty fields included)', async () => {
    const fields: Record<string, string> = {
      m_payment_id: 'abc',
      pf_payment_id: '1089250',
      payment_status: 'COMPLETE',
      item_description: '',
      amount_gross: '100.00',
    }
    const signature = generateSignature(fields, process.env.PAYFAST_PASSPHRASE, { skipEmpty: false })
    expect(await verifyITNSignature({ ...fields, signature })).toBe(true)
  })

  it('rejects a tampered amount', async () => {
    const fields: Record<string, string> = { m_payment_id: 'abc', amount_gross: '100.00' }
    const signature = generateSignature(fields, process.env.PAYFAST_PASSPHRASE, { skipEmpty: false })
    expect(await verifyITNSignature({ ...fields, amount_gross: '1.00', signature })).toBe(false)
  })

  it('rejects a missing signature', async () => {
    expect(await verifyITNSignature({ m_payment_id: 'abc' })).toBe(false)
  })

  it('rejects a signature made without the passphrase', async () => {
    const fields: Record<string, string> = { m_payment_id: 'abc', amount_gross: '100.00' }
    const signature = generateSignature(fields, undefined, { skipEmpty: false })
    expect(await verifyITNSignature({ ...fields, signature })).toBe(false)
  })
})
