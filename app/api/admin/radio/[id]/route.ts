import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

// DELETE — remove a radio event (any kind; the feed is curated, not sacred).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireAdmin()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('radio_events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
