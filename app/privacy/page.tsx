import type { Metadata } from 'next'
import { LegalPage, Section, Todo, Detail } from '@/components/store/LegalPage'
import { getSeller } from '@/lib/seller'

export const metadata: Metadata = { title: 'Privacy policy' }

export default function PrivacyPage() {
  const s = getSeller()
  return (
    <LegalPage title="Privacy policy">
      <Todo>
        The data and service-provider lists below describe what this website actually does today. The legal wording
        around them must be reviewed by a South African attorney (POPIA) before launch.
      </Todo>

      <Section title="Who is responsible for your information">
        <p>{s.tradingName} is the responsible party under the Protection of Personal Information Act (POPIA).</p>
        <Detail label="Registered name" value={s.legalName} envVar="SELLER_LEGAL_NAME" />
        <Detail label="Physical address" value={s.physicalAddress} envVar="SELLER_ADDRESS" />
        <Detail label="Information Officer" value={s.informationOfficer} envVar="SELLER_INFORMATION_OFFICER" />
        <Detail label="Contact email" value={s.email} envVar="SELLER_EMAIL" />
      </Section>

      <Section title="What we collect and why">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Name, email address, phone number and delivery address</strong>: to take and deliver your order
            and to contact you about it.
          </li>
          <li>
            <strong>Order details and payment reference</strong>: to process, track and support your order and keep
            records. We never see or store your card number; PayFast or Yoco handle it.
          </li>
          <li>
            <strong>Account details</strong> (if you create an account): your email and sign-in credentials, managed
            by our authentication provider, so you can view your orders.
          </li>
          <li>
            <strong>Technical data</strong> such as your IP address, used for security and to limit abuse.
          </li>
        </ul>
        <Todo>Add anything else you collect (analytics, marketing emails, cookies) and the legal basis for each.</Todo>
      </Section>

      <Section title="Who we share it with">
        <p>We share only what each provider needs to do its job:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>PayFast and Yoco: to take payment.</li>
          <li>
            Our suppliers and couriers: your <strong>name, phone number and delivery address</strong>, so they can
            ship your order. Some suppliers (for example AliExpress and CJ Dropshipping) are based outside South
            Africa, so this information is transferred across borders.
          </li>
          <li>Supabase (database and sign-in) and Vercel (website hosting): to run the website.</li>
          <li>Resend: to send you order emails.</li>
        </ul>
        <p>We do not send customer personal information to our AI tools, and we do not sell your information.</p>
        <Todo>
          Confirm each provider&apos;s data region and that the cross-border transfer wording meets POPIA section 72.
        </Todo>
      </Section>

      <Section title="How long we keep it">
        <Todo>
          State your retention periods (for example, tax and accounting records must generally be kept for 5 years).
        </Todo>
      </Section>

      <Section title="Your rights">
        <p>
          You may ask to see the information we hold about you, correct it, or have it deleted, and you may object to
          its use. If you have an account, you can delete it from your profile page; this removes your sign-in and
          anonymises your customer record. Order records we are legally required to keep are retained for the period
          above. For anything else, email us.
        </p>
        <p>
          If you are unhappy with how we handle your information you can complain to the Information Regulator
          (South Africa) at inforegulator.org.za.
        </p>
      </Section>
    </LegalPage>
  )
}
