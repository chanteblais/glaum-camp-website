import { supabaseAdmin } from '@/lib/supabase'

export type NotificationPreferences = {
  email_new_message: boolean
  email_announcements: boolean
  email_application: boolean
  email_attunement_nudges: boolean
  // Governs ALL gathering/shift emails: signup confirmations + the
  // day-before / morning-of reminders (migration 066).
  email_event_reminders: boolean
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_new_message: true,
  email_announcements: true,
  email_application: true,
  email_attunement_nudges: true,
  email_event_reminders: true,
}

/**
 * Fetch a member's notification preferences. A missing row means the member
 * has never changed anything — return all defaults (ON).
 */
export async function getNotificationPreferences(clerkUserId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('email_new_message, email_announcements, email_application, email_attunement_nudges, email_event_reminders')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  // Table/column may not exist yet (migration not applied) — fail open to defaults.
  if (error || !data) return { ...DEFAULT_PREFERENCES }

  return {
    email_new_message: data.email_new_message ?? true,
    email_announcements: data.email_announcements ?? true,
    email_application: data.email_application ?? true,
    email_attunement_nudges: data.email_attunement_nudges ?? true,
    email_event_reminders: data.email_event_reminders ?? true,
  }
}
