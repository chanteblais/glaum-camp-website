import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePollManager } from '@/lib/poll-auth'

export async function GET() {
  if (!(await requirePollManager())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ polls: data })
}

export async function POST(req: NextRequest) {
  if (!(await requirePollManager())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('polls')
    .insert([{
      question: body.question,
      options: body.options,
      visible: body.visible ?? true,
      allow_multiple: body.allow_multiple ?? false,
      expires_at: body.expires_at || null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ poll: data })
}
