import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { collectOutstandingAttunement } from '@/lib/attunement-nudge'
import { sendAttunementNudgeEmail } from '@/lib/send-email'
import { EVENT_NAME } from '@/lib/site-config'
import { daysUntilEvent } from '@/lib/camp-event'

export const dynamic = 'force-dynamic'
// A full sweep is N members × a few queries + one email each (throttled below);
// give the function room beyond the default 10s.
export const maxDuration = 60

// Daily cadence with slack: the cron targets the same hour every day, but
// Vercel may drift within the hour — 20h treats "roughly a day apart" as due,
// while still swallowing an accidental double fire.
const COOLDOWN_HOURS = 20
// Resend allows 2 requests/second — space sends out rather than burst.
const SEND_SPACING_MS = 600

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Two callers may run the sweep:
//   'cron'  — Vercel Cron with `Authorization: Bearer ${CRON_SECRET}` (sends by default)
//   'admin' — a logged-in admin hitting the URL in a browser (dry-runs by default,
//             add ?send=1 to actually send). Dry-run reports who would get what
//             without emailing or touching the ledger.
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

  const outstanding = await collectOutstandingAttunement()

  // Opt-outs + ledger in two batch queries.
  const clerkIds = outstanding.map(m => m.clerkUserId)
  const optedOut = new Set<string>()
  const lastSent = new Map<string, string>()
  if (clerkIds.length) {
    const [{ data: prefRows }, { data: ledgerRows }] = await Promise.all([
      supabaseAdmin
        .from('notification_preferences')
        .select('clerk_user_id, email_attunement_nudges')
        .in('clerk_user_id', clerkIds),
      supabaseAdmin
        .from('attunement_nudges')
        .select('clerk_user_id, last_sent_at')
        .in('clerk_user_id', clerkIds),
    ])
    for (const p of prefRows ?? []) if (p.email_attunement_nudges === false) optedOut.add(p.clerk_user_id)
    for (const l of ledgerRows ?? []) lastSent.set(l.clerk_user_id, l.last_sent_at)
  }

  const cooldownFloor = Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000
  const { data: startRow } = await supabaseAdmin
    .from('page_content')
    .select('value')
    .eq('key', 'config_event_start_date')
    .maybeSingle()
  const daysUntil = daysUntilEvent(startRow?.value)

  const report: { name: string; email: string | null; required: string[]; commitments: string[]; status: string }[] = []
  let sent = 0
  for (const m of outstanding) {
    const entry = {
      name: m.name,
      email: m.email,
      required: m.outstandingRequired.map(t => t.label),
      commitments: m.outstandingCommitments.map(t => t.label),
      status: 'due',
    }
    report.push(entry)

    if (!m.email) { entry.status = 'skipped: no email'; continue }
    if (optedOut.has(m.clerkUserId)) { entry.status = 'skipped: opted out'; continue }
    const last = lastSent.get(m.clerkUserId)
    if (last && new Date(last).getTime() > cooldownFloor) { entry.status = 'skipped: nudged recently'; continue }
    if (dryRun) { entry.status = 'would send'; continue }

    try {
      const result = await sendAttunementNudgeEmail({
        to: m.email,
        recipientName: m.name,
        required: m.outstandingRequired.map(t => ({ label: t.label, href: t.href })),
        commitments: m.outstandingCommitments.map(t => ({ label: t.label, href: t.href })),
        eventName: EVENT_NAME,
        daysUntil,
      })
      if (result.ok) {
        sent++
        entry.status = 'sent'
        const outstandingCount = m.outstandingRequired.length + m.outstandingCommitments.length
        const { data: existing } = await supabaseAdmin
          .from('attunement_nudges')
          .select('nudge_count')
          .eq('clerk_user_id', m.clerkUserId)
          .maybeSingle()
        await supabaseAdmin.from('attunement_nudges').upsert(
          {
            clerk_user_id: m.clerkUserId,
            last_sent_at: new Date().toISOString(),
            outstanding_count: outstandingCount,
            nudge_count: (existing?.nudge_count ?? 0) + 1,
          },
          { onConflict: 'clerk_user_id' }
        )
      } else {
        entry.status = `failed: ${result.error}`
      }
    } catch (err) {
      // Best-effort: one bad address must never stop the sweep.
      console.error('[attunement-nudges] send failed:', err)
      entry.status = 'failed'
    }
    await sleep(SEND_SPACING_MS)
  }

  return NextResponse.json({
    dryRun,
    caller,
    daysUntil,
    membersWithOutstanding: outstanding.length,
    sent,
    report,
  })
}
