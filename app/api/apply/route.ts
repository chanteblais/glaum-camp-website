import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check for duplicate application
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Application already submitted' }, { status: 409 })
    }

    const data = await req.json()

    const { error } = await supabaseAdmin
      .from('applications')
      .insert([{
        clerk_user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_name: data.preferred_name || null,
        pronouns: data.pronouns || null,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram || null,
        location: data.location || null,
        camped_before: data.camped_before,
        attendance: data.attendance,
        arrival_date: data.arrival_date || null,
        departure_date: data.departure_date || null,
        camp_relationship: data.camp_relationship,
        vehicle: data.vehicle || null,
        space_requirements: data.space_requirements || null,
        structures: data.structures || null,
        rideshare: data.rideshare || null,
        contributions: data.contributions || [],
        energizing_participation: data.energizing_participation || null,
        support_needs: data.support_needs || null,
        accessibility: data.accessibility || null,
        capacity: data.capacity || null,
        participation_style: data.participation_style || null,
        draws_to_glaum: data.draws_to_glaum || null,
        healthy_community: data.healthy_community || null,
        acknowledgements: data.acknowledgements || [],
        shrimp_relationship: data.shrimp_relationship || null,
        status: 'pending',
      }])

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Apply route error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
