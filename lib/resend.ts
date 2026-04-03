import { Resend } from 'resend'
import React from 'react'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  react: React.ReactElement
}) {
  const domain =
    process.env.NEXT_PUBLIC_STORE_URL?.replace('https://', '').replace(
      'http://',
      ''
    ) || 'dropempiresa.co.za'

  return resend.emails.send({
    from: `DropEmpire SA <orders@${domain}>`,
    to: params.to,
    subject: params.subject,
    react: params.react,
  })
}
