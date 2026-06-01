import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Glåüm Camp <onboarding@resend.dev>'

export async function sendAdminEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[sendAdminEmail]', error)
}

export async function sendUserEmail(to: string, subject: string, html: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  })
  if (error) console.error('[sendUserEmail]', error)
}
