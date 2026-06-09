import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Once the sender domain is verified in the Resend dashboard, set
// RESEND_FROM (e.g. "Glåüm Camp <notifications@glaum.camp>") in the env.
// Until then we fall back to Resend's shared sandbox sender.
const FROM = process.env.RESEND_FROM || 'Glåüm Camp <onboarding@resend.dev>'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://glaum.camp').replace(/\/$/, '')

export async function sendAdminEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html: wrap(html) })
  if (error) console.error('[sendAdminEmail]', error)
}

export async function sendUserEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html: wrap(html) })
  if (error) console.error('[sendUserEmail]', error)
}

/**
 * Notify a member that they have received a new message.
 * The link drops them straight into the sender's thread, and a footer
 * explains how to opt out of these emails.
 */
export async function sendNewMessageEmail(opts: {
  to: string
  recipientName: string
  senderName: string
  preview: string
  senderId: string
}) {
  const { to, recipientName, senderName, preview, senderId } = opts
  const threadUrl = `${APP_URL}/messages?to=${encodeURIComponent(senderId)}`
  const prefsUrl = `${APP_URL}/profile#notifications`
  const safePreview = escapeHtml(preview).slice(0, 280)

  const html = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#C8A848">${escapeHtml(senderName)}</strong> sent you a message on Glåüm:</p>
    <blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;font-style:italic;border-radius:6px">
      ${safePreview}${preview.length > 280 ? '…' : ''}
    </blockquote>
    <p style="margin:24px 0">
      <a href="${threadUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">Read &amp; reply ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you have message email notifications turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`

  await sendUserEmail(to, `${senderName} messaged you on Glåüm`, html)
}

// ── Helpers ───────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Light branded wrapper so all emails look consistent and professional.
function wrap(inner: string): string {
  return `
  <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:8px;color:#2a2018">
    <div style="text-align:center;padding:18px 0 8px">
      <span style="font-size:22px;letter-spacing:0.15em;color:#634D0B">G L Å Ü M</span>
    </div>
    <div style="background:#fbf7ee;border:1px solid #e6d9b8;border-radius:14px;padding:24px 28px;line-height:1.6">
      ${inner}
    </div>
    <p style="text-align:center;font-size:11px;color:#a59a86;margin:16px 0 8px">Glåüm Camp · Many Hands</p>
  </div>`
}
