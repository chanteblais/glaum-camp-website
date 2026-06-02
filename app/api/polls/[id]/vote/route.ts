import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const optionIndexes: number[] = Array.isArray(body.option_indexes) ? body.option_indexes : [body.option_index]

  // Verify poll exists and is visible
  const { data: poll } = await supabaseAdmin
    .from('polls')
    .select('id, allow_multiple, expires_at, options')
    .eq('id', params.id)
    .eq('visible', true)
    .maybeSingle()

  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Poll has expired' }, { status: 400 })
  }
  if (!poll.allow_multiple && optionIndexes.length > 1) {
    return NextResponse.json({ error: 'Multiple choices not allowed' }, { status: 400 })
  }

  // Remove existing votes for this user+poll, then insert new ones
  await supabaseAdmin.from('poll_votes').delete().eq('poll_id', params.id).eq('clerk_user_id', userId)

  const rows = optionIndexes.map(option_index => ({ poll_id: params.id, clerk_user_id: userId, option_index }))
  const { error } = await supabaseAdmin.from('poll_votes').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return updated vote counts
  const { data: votes } = await supabaseAdmin
    .from('poll_votes')
    .select('option_index')
    .eq('poll_id', params.id)

  const counts = Array((poll.options as unknown[]).length).fill(0)
  for (const v of votes ?? []) counts[v.option_index] = (counts[v.option_index] || 0) + 1

  return NextResponse.json({ counts, userVotes: optionIndexes })
}
