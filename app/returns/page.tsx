import type { Metadata } from 'next'
import { LegalPage, Section, Todo } from '@/components/store/LegalPage'

export const metadata: Metadata = { title: 'Returns & refunds' }

export default function ReturnsPage() {
  return (
    <LegalPage title="Returns & refunds">
      <Section title="Your rights by law">
        <p>
          Whatever our own policy says, South African consumer law gives you rights that we cannot take away,
          including:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            For goods bought online, a cooling-off period of 7 days from receiving them in which you may cancel
            without giving a reason (Electronic Communications and Transactions Act, section 44), at your cost for
            returning the goods unless we agree otherwise.
          </li>
          <li>
            The right to return goods that are defective, unsafe or not what was described, within 6 months of
            delivery, for repair, replacement or refund (Consumer Protection Act, section 56).
          </li>
        </ul>
        <Todo>
          Have these statements checked by a South African attorney, and confirm that the cooling-off exceptions
          (e.g. personalised or perishable goods) are listed if they apply to what you sell.
        </Todo>
      </Section>
      <Section title="How to return an item">
        <Todo>
          Describe the real process: who to contact, the address or courier method, who pays return shipping, and how
          long refunds take. Do not publish a longer return window (such as &quot;30 days&quot;) unless you will
          honour it for every product, including items supplied from overseas.
        </Todo>
      </Section>
      <Section title="Refunds">
        <p>Approved refunds are paid back to the original payment method (PayFast or Yoco).</p>
        <Todo>State the refund timeframe you can actually meet.</Todo>
      </Section>
    </LegalPage>
  )
}
