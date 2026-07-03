import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// List something that isn't asked for ("I have a guitar amp — useful?").
// Creates an open-callout item (quantity_needed NULL, offered_by = caller,
// migration 053) plus the offerer's own ×1 claim. No approval queue — an
// offer is a listing; admins edit it into a real need or delete noise.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { list_id, name, note } = await req.json()
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

  // Offering it means bringing it — seed the offerer's claim.
  const { error: claimError } = await supabaseAdmin
    .from('resource_claims')
    .insert({ resource_id: item.id, clerk_user_id: userId, quantity: 1 })
  if (claimError) {
    // Don't leave a claimless orphan offer behind.
    await supabaseAdmin.from('resources').delete().eq('id', item.id)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, item })
}
