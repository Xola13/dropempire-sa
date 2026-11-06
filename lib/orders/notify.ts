import React from 'react'
import { sendEmail } from '@/lib/resend'

/**
 * Emails the store owner. Never throws: an alert that fails must not break the
 * payment or fulfilment flow that raised it. Returns whether it was delivered so
 * callers can record a failed alert.
 */
export async function notifyOwner(subject: string, lines: string[]): Promise<boolean> {
  const to = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL
  if (!to) {
    console.error(JSON.stringify({ level: 'error', scope: 'notify', reason: 'no_owner_email', subject }))
    return false
  }
  try {
    await sendEmail({
      to,
      subject,
      react: React.createElement(
        'div',
        null,
        lines.map((line, i) =>
          React.createElement('p', { key: i, style: { whiteSpace: 'pre-wrap', margin: '0 0 12px' } }, line)
        )
      ),
    })
    return true
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        scope: 'notify',
        reason: 'send_failed',
        subject,
        message: e instanceof Error ? e.message : String(e),
      })
    )
    return false
  }
}
