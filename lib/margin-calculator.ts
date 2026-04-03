export function calculateMargin(
  supplierCost: number,
  sellingPrice: number,
  shippingCost: number = 0,
  paymentFeePercent: number = 3.5
) {
  const paymentFee = sellingPrice * (paymentFeePercent / 100)
  const netMargin = sellingPrice - supplierCost - shippingCost - paymentFee
  const marginPercent = (netMargin / sellingPrice) * 100
  const breakevenPrice = (supplierCost + shippingCost) / (1 - paymentFeePercent / 100)
  return { netMargin, marginPercent, paymentFee, breakevenPrice }
}

export function recommendSellingPrice(supplierCost: number, shippingCost: number) {
  const totalCost = supplierCost + shippingCost
  const sellingPrice = totalCost / (1 - 0.35)
  return Math.ceil(sellingPrice / 10) * 10
}

export function getMarginColor(marginPercent: number): string {
  if (marginPercent >= 35) return 'text-green-600'
  if (marginPercent >= 20) return 'text-yellow-600'
  if (marginPercent >= 10) return 'text-orange-600'
  return 'text-red-600'
}

export function getMarginLabel(marginPercent: number): string {
  if (marginPercent >= 35) return 'Excellent'
  if (marginPercent >= 25) return 'Good'
  if (marginPercent >= 15) return 'Acceptable'
  if (marginPercent >= 10) return 'Thin'
  return 'Unprofitable'
}
