import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prevent duplicate signups
  const { data: existing } = await supabaseAdmin
    .from('volunteers')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already signed up' }, { status: 409 })

  const data = await req.json()

  const { error } = await supabaseAdmin
    .from('volunteers')
    .insert([{
      clerk_user_id: userId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || null,
      days_available: data.days_available ?? [],
      preferred_times: data.preferred_times ?? [],
      shift_interests: data.shift_interests ?? [],
      other_notes: data.other_notes || null,
      status: 'active',
    }])

  if (error) {
    console.error('Volunteer signup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('volunteers')
    .update({ status: 'cancelled' })
    .eq('clerk_user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
