import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Detail } from '@/components/store/LegalPage'
import { getSeller } from '@/lib/seller'

export const metadata: Metadata = { title: 'Contact us' }

export default function ContactPage() {
  const s = getSeller()
  return (
    <LegalPage title="Contact us">
      <Section title="Who we are">
        <p>{s.tradingName} is an online store delivering to customers in South Africa.</p>
        <Detail label="Registered name" value={s.legalName} envVar="SELLER_LEGAL_NAME" />
        {s.registrationNumber && (
          <p>
            <span className="font-medium">Registration number:</span> {s.registrationNumber}
          </p>
        )}
        {s.vatNumber && (
          <p>
            <span className="font-medium">VAT number:</span> {s.vatNumber}
          </p>
        )}
        <Detail label="Physical address" value={s.physicalAddress} envVar="SELLER_ADDRESS" />
      </Section>
      <Section title="Get in touch">
        <Detail label="Email" value={s.email} envVar="SELLER_EMAIL" />
        {s.phone && (
          <p>
            <span className="font-medium">Phone:</span> {s.phone}
          </p>
        )}
        <p>
          Please quote your order number (it looks like ORD-XXXXXXXX) so we can help you faster. You can check an
          order&apos;s progress any time on the{' '}
          <Link className="text-amber-600 underline" href="/track">
            Track Order
          </Link>{' '}
          page.
        </p>
      </Section>
    </LegalPage>
  )
}
