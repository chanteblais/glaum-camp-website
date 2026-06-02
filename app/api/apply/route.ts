import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyAdmin } from '@/lib/notify-admin'

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

    const { data: inserted, error } = await supabaseAdmin
      .from('applications')
      .insert([{
        clerk_user_id: userId,
        avatar_url: data.avatar_url || null,

        // Section 1 — Basic Info
        first_name: data.first_name,
        last_name: data.last_name,
        preferred_name: data.preferred_name || null,
        pronouns: data.pronouns || null,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram || null,
        location: data.location || null,
        emergency_contact: data.emergency_contact || null,
        referral: data.referral || null,
        camped_before: data.camped_before,

        // Section 2 — About You
        about_you: data.about_you || null,
        glaum_acceptance: data.glaum_acceptance || null,
        special_skills: data.special_skills || null,
        recent_achievements: data.recent_achievements || null,
        official_designation: data.official_designation || null,
        research_interests: data.research_interests || null,
        known_side_effects: data.known_side_effects || null,
        attunement_status: data.attunement_status || [],
        attunement_status_other: data.attunement_status_other || null,

        // Section 3 — What If Plans
        attendance: data.attendance,
        arrival_date: data.arrival_date || null,
        departure_date: data.departure_date || null,
        camp_relationship: data.camp_relationship,
        vehicle: data.vehicle || null,
        space_requirements: data.space_requirements || null,
        structures: data.structures || null,
        rideshare: data.rideshare || null,

        // Section 2 (wizard) — new fields
        find_at_camp: data.find_at_camp || null,

        // Section 4 — Participation
        department_interests: data.department_interests || [],
        leadership_interest: data.leadership_interest || null,
        setup_available: data.setup_available || null,
        setup_preference: data.setup_preference || [],
        setup_limitations: data.setup_limitations || [],
        setup_notes: data.setup_notes || null,
        community_contribution: data.community_contribution || null,
        welcome_support: data.welcome_support || null,
        leadership_note: data.leadership_note || null,
        skills_contribution: data.skills_contribution || null,

        // Section 5 — Camp Culture
        draws_to_glaum: data.draws_to_glaum || null,
        healthy_community: data.healthy_community || null,

        // Section 6 — Contribution Expectations
        acknowledgements: data.acknowledgements || [],

        // Section 7 — Final Glåüm Questions
        shrimp_relationship: data.shrimp_relationship || null,

        // Custom sections (admin-added)
        ...(data.custom_answers && Object.keys(data.custom_answers).length > 0
          ? { custom_answers: data.custom_answers }
          : {}),

        status: 'pending',
      }])
      .select('id')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const displayName = [data.preferred_name || data.first_name, data.last_name].filter(Boolean).join(' ')
    await notifyAdmin({
      eventType: 'new_application',
      applicationId: inserted?.id ?? null,
      message: `New application from ${displayName}`,
      details: { email: data.email },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Apply route error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
