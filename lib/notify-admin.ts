import { supabaseAdmin } from '@/lib/supabase'

type NotifyAdminInput = {
  applicationId?: string | null
  eventType: 'profile_updated' | 'attendance_cancelled' | 'volunteer_cancelled' | 'volunteer_signup'
  message: string
  details?: Record<string, unknown>
}

export async function notifyAdmin(input: NotifyAdminInput): Promise<void> {
  const { error } = await supabaseAdmin.from('admin_notifications').insert([
    {
      application_id: input.applicationId ?? null,
      event_type: input.eventType,
      message: input.message,
      details: input.details ?? null,
    },
  ])

  if (error) {
    console.error('[notifyAdmin] Failed to insert notification:', error.message)
  }
}

export function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function summarizeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const field of fields) {
    const prev = before[field]
    const next = after[field]
    const prevNorm = Array.isArray(prev) ? prev.join(', ') : prev ?? null
    const nextNorm = Array.isArray(next) ? next.join(', ') : next ?? null
    if (String(prevNorm) !== String(nextNorm)) {
      changes[field] = { from: prevNorm, to: nextNorm }
    }
  }

  return changes
}
