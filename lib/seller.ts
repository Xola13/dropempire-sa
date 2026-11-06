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

type Env = Record<string, string | undefined>

export function getSeller(env: Env = process.env): SellerDetails {
  return {
    tradingName: clean(env.SELLER_TRADING_NAME) ?? 'DropEmpire SA',
    legalName: clean(env.SELLER_LEGAL_NAME),
    registrationNumber: clean(env.SELLER_REG_NUMBER),
    vatNumber: clean(env.SELLER_VAT_NUMBER),
    physicalAddress: clean(env.SELLER_ADDRESS),
    email: clean(env.SELLER_EMAIL),
    phone: clean(env.SELLER_PHONE),
    informationOfficer: clean(env.SELLER_INFORMATION_OFFICER),
  }
}

/** Names of the required details that are still unset. Used by the go-live check. */
export function missingSellerDetails(env: Env = process.env): string[] {
  const s = getSeller(env)
  const required: [string, string | null][] = [
    ['SELLER_LEGAL_NAME', s.legalName],
    ['SELLER_ADDRESS', s.physicalAddress],
    ['SELLER_EMAIL', s.email],
    ['SELLER_INFORMATION_OFFICER', s.informationOfficer],
  ]
  return required.filter(([, v]) => !v).map(([k]) => k)
}
