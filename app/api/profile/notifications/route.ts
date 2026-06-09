import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getNotificationPreferences } from '@/lib/notification-prefs'

export const dynamic = 'force-dynamic'

const KEYS = ['email_new_message', 'email_announcements', 'email_application'] as const

// GET /api/profile/notifications — current member's preferences
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await getNotificationPreferences(userId)
  return NextResponse.json({ preferences: prefs }, { headers: { 'Cache-Control': 'no-store' } })
}

// PATCH /api/profile/notifications — upsert preferences
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, boolean> = {}
  for (const key of KEYS) {
    if (key in body) updates[key] = Boolean(body[key])
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('notification_preferences')
    .upsert(
      { clerk_user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'clerk_user_id' }
    )

  if (error) {
    console.error('[profile/notifications PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const prefs = await getNotificationPreferences(userId)
  return NextResponse.json({ success: true, preferences: prefs })
}
