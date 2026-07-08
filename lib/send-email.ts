import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Sender is RESEND_FROM (e.g. "Glåüm Camp <notifications@glaum.ca>"); the
// domain must be verified in the Resend dashboard. If unset we fall back to
// Resend's shared sandbox sender. Note: the verified email domain (glaum.ca)
// is distinct from the site domain (camp.glaum.ca, see NEXT_PUBLIC_SITE_URL).
const FROM = process.env.RESEND_FROM || 'Glåüm Camp <onboarding@resend.dev>'

export const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://camp.glaum.ca').replace(/\/$/, '')

export type SendResult = { ok: boolean; error?: string }

export async function sendAdminEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html: wrap(html) })
  if (error) {
    console.error('[sendAdminEmail]', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function sendUserEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html: wrap(html) })
  if (error) {
    console.error('[sendUserEmail]', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
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

  return sendUserEmail(to, `${senderName} messaged you on Glåüm`, html)
}

/**
 * Notify a member they were @mentioned in a group thread. Links straight into
 * the group's thread. Sent even when group threads are otherwise quiet — a
 * mention is a deliberate, targeted signal.
 */
export async function sendGroupMentionEmail(opts: {
  to: string
  recipientName: string
  senderName: string
  groupName: string
  groupId: string
  preview: string
}) {
  const { to, recipientName, senderName, groupName, groupId, preview } = opts
  const threadUrl = `${APP_URL}/messages/g/${encodeURIComponent(groupId)}`
  const prefsUrl = `${APP_URL}/profile#notifications`
  const safePreview = escapeHtml(preview).slice(0, 280)

  const html = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#C8A848">${escapeHtml(senderName)}</strong> mentioned you in <strong>${escapeHtml(groupName)}</strong> on Glåüm:</p>
    <blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;font-style:italic;border-radius:6px">
      ${safePreview}${preview.length > 280 ? '…' : ''}
    </blockquote>
    <p style="margin:24px 0">
      <a href="${threadUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">View the thread ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you were mentioned and have message email notifications turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`

  await sendUserEmail(to, `${senderName} mentioned you in ${groupName}`, html)
}

/**
 * Notify a member who opted into email for a group thread that there's new
 * activity. Sent at most once per quiet period (throttled in the route), so it
 * behaves like a "the thread is active again" nudge rather than per-message spam.
 */
export async function sendGroupActivityEmail(opts: {
  to: string
  recipientName: string
  senderName: string
  groupName: string
  groupId: string
  preview: string
}) {
  const { to, recipientName, senderName, groupName, groupId, preview } = opts
  const threadUrl = `${APP_URL}/messages/g/${encodeURIComponent(groupId)}`
  const prefsUrl = `${APP_URL}/profile#notifications`
  const safePreview = escapeHtml(preview).slice(0, 280)

  const html = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p>New activity in <strong style="color:#C8A848">${escapeHtml(groupName)}</strong> on Glåüm:</p>
    <blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;font-style:italic;border-radius:6px">
      <strong>${escapeHtml(senderName)}:</strong> ${safePreview}${preview.length > 280 ? '…' : ''}
    </blockquote>
    <p style="margin:24px 0">
      <a href="${threadUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">Open the thread ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you turned on email for this group. Open the thread to mute or turn it off, or
      <a href="${prefsUrl}" style="color:#8a8a8a">manage your notification preferences</a>.
    </p>`

  await sendUserEmail(to, `New activity in ${groupName}`, html)
}

/**
 * Announce a new lead-up gathering (planning/brainstorm session) to a member.
 * Links to the /schedule page where they can read details and RSVP. Gated by
 * the recipient's `email_announcements` preference (checked by the caller).
 */
export async function sendLeadUpGatheringEmail(opts: {
  to: string
  recipientName: string
  title: string
  when: string | null
  location: string | null
  link: string | null
  imageUrl?: string | null
}) {
  const { to, recipientName, title, when, location, link, imageUrl } = opts
  const scheduleUrl = `${APP_URL}/schedule`
  const prefsUrl = `${APP_URL}/profile#notifications`

  const banner = imageUrl
    ? `<img src="${encodeURI(imageUrl)}" alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin:0 0 16px" />`
    : ''

  const detailRows = [
    when ? `<p style="margin:4px 0"><strong>When:</strong> ${escapeHtml(when)}</p>` : '',
    location ? `<p style="margin:4px 0"><strong>Where:</strong> ${escapeHtml(location)}</p>` : '',
    link ? `<p style="margin:4px 0"><strong>Link:</strong> <a href="${encodeURI(link)}" style="color:#634D0B">${escapeHtml(link)}</a></p>` : '',
  ].join('')

  const html = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p>A new gathering on the way to camp:</p>
    ${banner}
    <div style="margin:18px 0;padding:14px 18px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;border-radius:6px">
      <p style="margin:0 0 6px;font-size:17px;color:#634D0B"><strong>${escapeHtml(title)}</strong></p>
      ${detailRows}
    </div>
    <p style="margin:24px 0">
      <a href="${scheduleUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">View &amp; RSVP ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you have announcement emails turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`

  return sendUserEmail(to, `New gathering: ${title}`, html)
}

/**
 * Daily attunement nudge: the member's outstanding checklist, exactly as the
 * home banner / profile card compute it. Required tasks are the headline
 * (they gate "Attuned"); commitment items ride along in a gentler section —
 * a guide to what the member signed up for, never a blocker. Gated by the
 * recipient's `email_attunement_nudges` preference (checked by the caller).
 */
export async function sendAttunementNudgeEmail(opts: {
  to: string
  recipientName: string
  required: { label: string; href?: string }[]
  commitments: { label: string; href?: string }[]
  eventName: string
  daysUntil: number
}) {
  const { to, recipientName, required, commitments, eventName, daysUntil } = opts
  const prefsUrl = `${APP_URL}/profile#notifications`

  const taskList = (items: { label: string; href?: string }[]) => `
    <ul style="margin:10px 0 18px;padding-left:0;list-style:none">
      ${items.map(t => `
        <li style="margin:6px 0;padding:9px 14px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);border-radius:6px;color:#3a2b14">
          ✦&nbsp; ${t.href
            ? `<a href="${APP_URL}${encodeURI(t.href)}" style="color:#634D0B;text-decoration:none;font-weight:bold">${escapeHtml(t.label)}</a>`
            : `<strong>${escapeHtml(t.label)}</strong>`}
        </li>`).join('')}
    </ul>`

  const countdown = daysUntil > 0
    ? `${escapeHtml(eventName)} gathers in <strong>${daysUntil} day${daysUntil === 1 ? '' : 's'}</strong>.`
    : `${escapeHtml(eventName)} is here.`

  const requiredBlock = required.length
    ? `<p style="margin:18px 0 0">To complete your attunement:</p>${taskList(required)}`
    : ''
  const commitmentsBlock = commitments.length
    ? `<p style="margin:18px 0 0;color:#6b5a3e">And from the commitments you've taken on:</p>${taskList(commitments)}`
    : ''

  const n = required.length
  const subject = n > 0
    ? `Your attunement awaits — ${n} step${n === 1 ? '' : 's'} remain${n === 1 ? 's' : ''}`
    : 'A gentle word about your commitments'

  const html = `
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p>${countdown} The triangle holds, the eye witnesses — and a few things still await your hands:</p>
    ${requiredBlock}
    ${commitmentsBlock}
    <p style="margin:24px 0">
      <a href="${APP_URL}/profile" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">Complete your attunement ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you have outstanding attunement tasks and attunement reminders turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`

  return sendUserEmail(to, subject, html)
}

/**
 * Notify a member they were @mentioned in a Radio post. Gated by the
 * recipient's message-notification preference (checked at the seam).
 */
export async function sendRadioMentionEmail(opts: {
  to: string
  recipientName: string
  senderName: string
  preview: string
}) {
  const { to, recipientName, senderName, preview } = opts
  const radioUrl = `${APP_URL}/radio`
  const prefsUrl = `${APP_URL}/profile#notifications`
  const safePreview = escapeHtml(preview).slice(0, 280)

  const html = wrap(`
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#634D0B">${escapeHtml(senderName)}</strong> mentioned you on Glåüm Radio:</p>
    <blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;font-style:italic;border-radius:6px">
      ${safePreview}${preview.length > 280 ? '…' : ''}
    </blockquote>
    <p style="margin:24px 0">
      <a href="${radioUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">Tune in ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you were mentioned and have message email notifications turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`)

  await sendUserEmail(to, `${senderName} mentioned you on Radio`, html)
}

/**
 * The "notify everyone" megaphone: a Radio post that deliberately rings the
 * whole camp. Gated by the recipient's announcement preference (checked by the
 * caller). Mirrors the organizer-broadcast email so both read the same.
 */
export async function sendRadioBroadcastEmail(opts: {
  to: string
  recipientName: string
  senderName: string
  message: string
}) {
  const { to, recipientName, senderName, message } = opts
  const radioUrl = `${APP_URL}/radio`
  const prefsUrl = `${APP_URL}/profile#notifications`
  const safeMessage = escapeHtml(message).slice(0, 400)

  const html = wrap(`
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p>📢 <strong style="color:#634D0B">${escapeHtml(senderName)}</strong> is on the air:</p>
    <blockquote style="margin:18px 0;padding:12px 16px;border-left:3px solid #C8A848;background:rgba(200,168,72,0.06);color:#3a2b14;font-style:italic;border-radius:6px">
      ${safeMessage}${message.length > 400 ? '…' : ''}
    </blockquote>
    <p style="margin:24px 0">
      <a href="${radioUrl}" style="display:inline-block;background:#C8A848;color:#1A0A24;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:bold">Tune in to Radio ✦</a>
    </p>
    <p style="font-size:12px;color:#8a8a8a;margin-top:28px">
      You're receiving this because you have announcement emails turned on.
      <a href="${prefsUrl}" style="color:#8a8a8a">Manage your notification preferences</a>.
    </p>`)

  await sendUserEmail(to, `${senderName} on Radio: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`, html)
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
