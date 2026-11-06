import { Resend } from 'resend'
import React from 'react'
import { getSiteHostname } from '@/lib/site'

// Created lazily: `new Resend(undefined)` throws, which would break any build or
// route that merely imports this module without email configured.
let client: Resend | null = null
function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    client = new Resend(key)
  }
  return client
}

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  react: React.ReactElement
}) {
  const host = getSiteHostname().replace(/^www\./, '')
  const from = process.env.FROM_EMAIL
    ? `DropEmpire SA <${process.env.FROM_EMAIL}>`
    : `DropEmpire SA <orders@${host}>`

  const { data, error } = await getResend().emails.send({
    from,
    to: params.to,
    subject: params.subject,
    react: params.react,
  })
  // Resend reports API failures in `error` rather than throwing; surface them so
  // callers' try/catch and logs actually see a failed send.
  if (error) throw new Error(`Email send failed: ${error.message}`)
  return data
}
