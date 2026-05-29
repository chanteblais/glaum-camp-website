import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Place new event at the end of its group
  const { data: last } = await supabaseAdmin
    .from('schedule_events')
    .select('sort_order')
    .eq('is_recurring', body.is_recurring ?? false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = (last?.sort_order ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('schedule_events')
    .insert([{
      day: body.day,
      time: body.time,
      title: body.title,
      subtitle: body.subtitle || null,
      detail_desc: body.detail_desc || null,
      icon_type: body.icon_type || 'star',
      sort_order,
      visible: body.visible ?? true,
      highlight: body.highlight ?? false,
      is_recurring: body.is_recurring ?? false,
      capacity: body.capacity ?? null,
      event_type: body.event_type ?? null,
      contribution_type: body.contribution_type ?? null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
