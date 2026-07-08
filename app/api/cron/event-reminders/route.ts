import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { collectEventReminders, campDate } from '@/lib/event-reminders'
import { sendEventReminderEmail } from '@/lib/send-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Gathering/shift reminders. Two Vercel Cron entries hit this route (vercel.json):
//   • ?phase=morning_of  — fires in the camp morning; reminds about items TODAY
//   • ?phase=day_before  — fires the evening before; reminds about items TOMORROW
// With no ?phase, both run (a safe default if the query string is ever dropped).
// Reminders are batched (one email per member per phase per day) and deduped via
// the event_reminders_sent ledger, so a re-fire or overlap never double-sends.

const SEND_SPACING_MS = 600 // Resend allows ~2 req/s
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
type Phase = 'day_before' | 'morning_of'

// 'cron'  — Vercel Cron with Authorization: Bearer ${CRON_SECRET} (sends)
// 'admin' — a logged-in admin hitting the URL (dry-runs unless ?send=1)
async function authorize(req: NextRequest): Promise<'cron' | 'admin' | null> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return 'cron'
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? 'admin' : null
}

export async function GET(req: NextRequest) {
  const caller = await authorize(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const dryRun = caller === 'admin' ? params.get('send') !== '1' : params.get('dryRun') === '1'
  const requested = params.get('phase') as Phase | null
  const phases: Phase[] = requested ? [requested] : ['morning_of', 'day_before']

  const report: Record<string, unknown>[] = []
  let sent = 0

  // Testing aid: ?date=YYYY-MM-DD overrides the computed today/tomorrow so a
  // dry-run can preview a date that actually has items. Safe in prod — the cron
  // never passes it, and the ledger dedupes any manual re-send by (member, date, phase).
  const dateOverride = params.get('date')

  for (const phase of phases) {
    const targetDate = dateOverride ?? campDate(phase === 'day_before' ? 1 : 0)
    const recipients = await collectEventReminders(targetDate)

    // Opt-outs + already-sent ledger for this (date, phase), in two batch queries.
    const ids = recipients.map(r => r.clerkUserId)
    const optedOut = new Set<string>()
    const alreadySent = new Set<string>()
    if (ids.length) {
      const [{ data: prefRows }, { data: ledgerRows }] = await Promise.all([
        supabaseAdmin.from('notification_preferences')
          .select('clerk_user_id, email_event_reminders').in('clerk_user_id', ids),
        supabaseAdmin.from('event_reminders_sent')
          .select('clerk_user_id').eq('target_date', targetDate).eq('phase', phase).in('clerk_user_id', ids),
      ])
      for (const p of prefRows ?? []) if (p.email_event_reminders === false) optedOut.add(p.clerk_user_id)
      for (const l of ledgerRows ?? []) alreadySent.add(l.clerk_user_id)
    }

    for (const r of recipients) {
      const entry: Record<string, unknown> = {
        phase, targetDate, name: r.name, email: r.email, items: r.items.map(i => `${i.kind}:${i.title}`), status: 'due',
      }
      report.push(entry)

      if (!r.email) { entry.status = 'skipped: no email'; continue }
      if (optedOut.has(r.clerkUserId)) { entry.status = 'skipped: opted out'; continue }
      if (alreadySent.has(r.clerkUserId)) { entry.status = 'skipped: already sent'; continue }
      if (dryRun) { entry.status = 'would send'; continue }

      try {
        const result = await sendEventReminderEmail({ to: r.email, recipientName: r.name, phase, items: r.items })
        if (result.ok) {
          sent++
          entry.status = 'sent'
          // Claim the ledger slot; ignore conflict (a concurrent fire may have sent).
          await supabaseAdmin.from('event_reminders_sent')
            .upsert({ clerk_user_id: r.clerkUserId, target_date: targetDate, phase }, { onConflict: 'clerk_user_id,target_date,phase', ignoreDuplicates: true })
        } else {
          entry.status = `failed: ${result.error}`
        }
      } catch (err) {
        console.error('[event-reminders] send failed:', err)
        entry.status = 'failed'
      }
      await sleep(SEND_SPACING_MS)
    }
  }

  return NextResponse.json({ dryRun, caller, phases, sent, recipients: report.length, report })
}
