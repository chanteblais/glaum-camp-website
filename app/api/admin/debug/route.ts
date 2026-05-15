import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  if (user.publicMetadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Not admin' }, { status: 403 })
  }

  const { data, error, count } = await supabaseAdmin
    .from('applications')
    .select('id, email, status, submitted_at', { count: 'exact' })
    .order('submitted_at', { ascending: false })

  return NextResponse.json({
    supabaseError: error ?? null,
    count,
    rows: data ?? [],
  })
}
