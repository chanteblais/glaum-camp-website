import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const userId = await requireAdmin()
  if (!userId) return NextResponse.json({ error: 'Not admin' }, { status: 403 })

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
