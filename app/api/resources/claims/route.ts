import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

// Set the caller's claim on a resource. quantity >= 1 upserts the single
// per-member claim row; quantity 0 removes it (unclaiming is always allowed —
// the totals should reflect reality, not hold members hostage).
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resource_id, quantity } = await req.json()
  if (!resource_id || typeof quantity !== 'number' || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: 'resource_id and quantity are required' }, { status: 400 })
  }
  const qty = Math.min(99, Math.max(0, Math.floor(quantity)))

  // Only items on a member-visible list can be claimed.
  const { data: resource } = await supabaseAdmin
    .from('resources')
    .select('id, resource_lists(visible)')
    .eq('id', resource_id)
    .maybeSingle()
  const list = Array.isArray(resource?.resource_lists) ? resource?.resource_lists[0] : resource?.resource_lists
  if (!resource || !(list as { visible: boolean } | null | undefined)?.visible) {
    return NextResponse.json({ error: 'This item is not available' }, { status: 403 })
  }

  if (qty === 0) {
    const { error } = await supabaseAdmin
      .from('resource_claims')
      .delete()
      .eq('resource_id', resource_id)
      .eq('clerk_user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('resource_claims')
      .upsert(
        { resource_id, clerk_user_id: userId, quantity: qty, updated_at: new Date().toISOString() },
        { onConflict: 'resource_id,clerk_user_id' },
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, quantity: qty })
}
