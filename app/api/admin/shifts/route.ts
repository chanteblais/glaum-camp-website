import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') return null
  return userId
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('id, label, date, start_time, end_time, capacity, sort_order')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shifts: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { label, date, start_time, end_time, capacity, sort_order } = body

  if (!label || !start_time || !end_time || capacity == null) {
    return NextResponse.json({ error: 'label, start_time, end_time, and capacity are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .insert({ label, date: date ?? null, start_time, end_time, capacity, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shift: data })
}
