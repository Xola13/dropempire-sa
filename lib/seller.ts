// Who is selling. South African law requires these details on the site
// (ECT Act s43, CPA, POPIA information officer). They come from env vars so they are
// never invented in code: unset values render a visible "to be completed" marker.

export interface SellerDetails {
  tradingName: string
  legalName: string | null
  registrationNumber: string | null
  vatNumber: string | null
  physicalAddress: string | null
  email: string | null
  phone: string | null
  informationOfficer: string | null
}

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null)

export function getSeller(): SellerDetails {
  return {
    tradingName: clean(process.env.SELLER_TRADING_NAME) ?? 'DropEmpire SA',
    legalName: clean(process.env.SELLER_LEGAL_NAME),
    registrationNumber: clean(process.env.SELLER_REG_NUMBER),
    vatNumber: clean(process.env.SELLER_VAT_NUMBER),
    physicalAddress: clean(process.env.SELLER_ADDRESS),
    email: clean(process.env.SELLER_EMAIL),
    phone: clean(process.env.SELLER_PHONE),
    informationOfficer: clean(process.env.SELLER_INFORMATION_OFFICER),
  }
}

/** Names of the required details that are still unset. Used by the go-live check. */
export function missingSellerDetails(): string[] {
  const s = getSeller()
  const required: [string, string | null][] = [
    ['SELLER_LEGAL_NAME', s.legalName],
    ['SELLER_ADDRESS', s.physicalAddress],
    ['SELLER_EMAIL', s.email],
    ['SELLER_INFORMATION_OFFICER', s.informationOfficer],
  ]
  return required.filter(([, v]) => !v).map(([k]) => k)
}
