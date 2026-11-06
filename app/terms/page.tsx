import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Section, Todo, Detail } from '@/components/store/LegalPage'
import { getSeller } from '@/lib/seller'

export const metadata: Metadata = { title: 'Terms of service' }

export default function TermsPage() {
  const s = getSeller()
  return (
    <LegalPage title="Terms of service">
      <Todo>
        This is a structure, not a finished legal document. Have it reviewed by a South African attorney before you
        take payments.
      </Todo>
      <Section title="1. Who we are">
        <p>The seller is {s.tradingName}.</p>
        <Detail label="Registered name" value={s.legalName} envVar="SELLER_LEGAL_NAME" />
        <Detail label="Physical address" value={s.physicalAddress} envVar="SELLER_ADDRESS" />
        <Detail label="Email" value={s.email} envVar="SELLER_EMAIL" />
      </Section>
      <Section title="2. Orders and payment">
        <p>
          Prices are in South African rand (ZAR). Payments are processed by PayFast or Yoco; we never see or store
          your card number. An order is accepted once your payment is confirmed.
        </p>
        <Todo>
          State whether prices include VAT and when you accept or may cancel an order (e.g. stock or pricing errors).
        </Todo>
      </Section>
      <Section title="3. Delivery">
        <p>
          Many of our products are sourced from suppliers and shipped to you after you order, so delivery times vary
          by product and are shown on the product page where known.
        </p>
        <Todo>
          State your delivery areas, shipping charges, and realistic delivery time ranges (including overseas-sourced
          items).
        </Todo>
      </Section>
      <Section title="4. Returns and refunds">
        <p>
          See our{' '}
          <Link className="text-amber-600 underline" href="/returns">
            returns and refunds page
          </Link>
          .
        </p>
      </Section>
      <Section title="5. Your personal information">
        <p>
          See our{' '}
          <Link className="text-amber-600 underline" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </Section>
      <Section title="6. Liability and governing law">
        <Todo>Have your attorney supply the limitation of liability and dispute clauses. South African law applies.</Todo>
      </Section>
    </LegalPage>
  )
}
