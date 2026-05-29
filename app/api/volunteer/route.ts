import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyAdmin } from '@/lib/notify-admin'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check for existing record (may be cancelled)
  const { data: existing } = await supabaseAdmin
    .from('volunteers')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (existing?.status === 'active') return NextResponse.json({ error: 'Already signed up' }, { status: 409 })

  const data = await req.json()

  const payload = {
    first_name: data.first_name,
    last_name: data.last_name,
    preferred_name: data.preferred_name || null,
    pronouns: data.pronouns || null,
    email: data.email,
    phone: data.phone || null,
    brings_to_glaum: data.brings_to_glaum || null,
    role_interests: data.role_interests ?? [],
    days_available: data.days_available ?? [],
    specific_interests: data.specific_interests || null,
    special_skills: data.special_skills || null,
    familiar_with_glaum: data.familiar_with_glaum ?? false,
    why_contribute: data.why_contribute || null,
    status: 'active',
  }

  // Re-signup: update existing cancelled record instead of inserting
  const { error } = existing
    ? await supabaseAdmin.from('volunteers').update(payload).eq('id', existing.id)
    : await supabaseAdmin.from('volunteers').insert([{ clerk_user_id: userId, ...payload }])

  if (error) {
    console.error('Volunteer signup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const displayName =
    (data.preferred_name as string | null) ||
    (data.first_name as string | null) ||
    'Someone'

  await notifyAdmin({
    eventType: 'volunteer_signup',
    message: `${displayName} signed up to volunteer`,
    details: { email: data.email },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch volunteer record first so we have their name/email for the notification
  const { data: volunteer } = await supabaseAdmin
    .from('volunteers')
    .select('first_name, preferred_name, email')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('volunteers')
    .update({ status: 'cancelled' })
    .eq('clerk_user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (volunteer) {
    const displayName =
      (volunteer.preferred_name as string | null) ||
      (volunteer.first_name as string | null) ||
      'Volunteer'

    await notifyAdmin({
      eventType: 'volunteer_cancelled',
      message: `${displayName} cancelled their volunteer registration`,
      details: { email: volunteer.email },
    })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabaseAdmin
    .from('volunteers')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Volunteer record not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if ('phone' in body) updates.phone = body.phone || null
  if ('days_available' in body) updates.days_available = Array.isArray(body.days_available) ? body.days_available : []
  if ('preferred_times' in body) updates.preferred_times = Array.isArray(body.preferred_times) ? body.preferred_times : []
  if ('shift_interests' in body) updates.shift_interests = Array.isArray(body.shift_interests) ? body.shift_interests : []
  if ('other_notes' in body) updates.other_notes = body.other_notes || null

  const { error } = await supabaseAdmin
    .from('volunteers')
    .update(updates)
    .eq('id', existing.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
