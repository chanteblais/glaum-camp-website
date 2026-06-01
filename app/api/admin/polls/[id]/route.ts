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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('question' in body) updates.question = body.question
  if ('options' in body) updates.options = body.options
  if ('visible' in body) updates.visible = body.visible
  if ('allow_multiple' in body) updates.allow_multiple = body.allow_multiple
  if ('expires_at' in body) updates.expires_at = body.expires_at || null

  const { data, error } = await supabaseAdmin
    .from('polls')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ poll: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin.from('polls').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
