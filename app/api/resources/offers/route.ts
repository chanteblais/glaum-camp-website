import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getApprovedMember } from '@/lib/members'
import { postSourcedRadioEvent, getRadioActorName, contributionRadioPost } from '@/lib/radio'

// Suggest a resource the organizers haven't listed ("we'll want sharp
// knives" / "I have a guitar amp — useful?"). Creates an open-callout item
// (quantity_needed NULL, offered_by = caller, migration 053); when the
// suggester can bring it themselves (`bring`, default true) their ×1 claim
// is seeded too. No approval queue — a suggestion is collaborative planning;
// admins set a target on a good one (→ tracked need) or delete noise.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Approved members only — same gate as the /participate page this backs.
  const member = await getApprovedMember(userId)
  if (!member) {
    return NextResponse.json({ error: 'Only approved members can suggest resources' }, { status: 403 })
  }
  if (member.suspended_at) {
    return NextResponse.json({ error: 'Your attendance is suspended — resume it on your profile to bring items.' }, { status: 403 })
  }

  const { list_id, name, note, bring } = await req.json()
  if (!list_id) return NextResponse.json({ error: 'list_id is required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Offers only land on lists members can see.
  const { data: list } = await supabaseAdmin
    .from('resource_lists')
    .select('id, visible')
    .eq('id', list_id)
    .maybeSingle()
  if (!list?.visible) return NextResponse.json({ error: 'This list is not available' }, { status: 403 })

  const { data: item, error } = await supabaseAdmin
    .from('resources')
    .insert({
      list_id,
      name: name.trim().slice(0, 80),
      note: note?.trim().slice(0, 200) || null,
      quantity_needed: null,
      offered_by: userId,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed the suggester's claim when they're bringing it themselves.
  if (bring !== false) {
    const { error: claimError } = await supabaseAdmin
      .from('resource_claims')
      .insert({ resource_id: item.id, clerk_user_id: userId, quantity: 1 })
    if (claimError) {
      // Don't leave an orphan suggestion behind on a failed claim.
      await supabaseAdmin.from('resources').delete().eq('id', item.id)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    // Radio: an offer with "I'll bring it" is the same commitment moment as a
    // first claim (bare suggestions without a claim stay silent). Open offers
    // have no target, so the copy is "is bringing" with no countdown.
    const actorName = await getRadioActorName(userId)
    await postSourcedRadioEvent('contribution', {
      ...contributionRadioPost(actorName, item.name, 1, null),
      actorClerkId: userId,
      actorName,
    })
  }

  return NextResponse.json({ success: true, item })
}
