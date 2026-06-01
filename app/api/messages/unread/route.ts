import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ count: 0 })

  const { count, error } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_clerk_id', userId)
    .is('read_at', null)

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ count: 0 })
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
}
