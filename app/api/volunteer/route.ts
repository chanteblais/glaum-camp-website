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
