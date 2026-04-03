import md5 from 'md5'

const PAYFAST_HOST =
  process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true'
    ? 'sandbox.payfast.co.za'
    : 'www.payfast.co.za'

export function generateSignature(
  params: Record<string, string>,
  passphrase?: string
): string {
  const sortedKeys = Object.keys(params).sort()
  let queryString = sortedKeys
    .filter(k => params[k] !== '')
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&')
  if (passphrase) {
    queryString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
  }
  return md5(queryString)
}

export function generatePaymentForm(order: {
  id: string
  orderNumber: string
  customerEmail: string
  customerName: string
  total: number
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
}): { action: string; params: Record<string, string> } {
  const nameParts = order.customerName.split(' ')
  const params: Record<string, string> = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID!,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
    return_url: order.returnUrl,
    cancel_url: order.cancelUrl,
    notify_url: order.notifyUrl,
    name_first: nameParts[0] || order.customerName,
    name_last: nameParts.slice(1).join(' ') || '',
    email_address: order.customerEmail,
    m_payment_id: order.id,
    amount: order.total.toFixed(2),
    item_name: order.orderNumber,
    item_description: `DropEmpire SA Order ${order.orderNumber}`,
  }

  params.signature = generateSignature(
    params,
    process.env.PAYFAST_PASSPHRASE
  )

  return {
    action: `https://${PAYFAST_HOST}/eng/process`,
    params,
  }
}

export function validateITN(params: Record<string, string>): boolean {
  const received = params.signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signature: _sig, ...rest } = params
  const expected = generateSignature(rest, process.env.PAYFAST_PASSPHRASE)
  return received === expected && params.payment_status === 'COMPLETE'
}
