import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { PAGE_CONTENT_TAG } from '@/lib/page-content'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('page_content')
    .select('key, value')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const content = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json({ content })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, string> = await req.json()

  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('page_content')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invalidate every cached getPageContent() read (lib/page-content.ts).
  // Next 16 semantics: the 'max' profile marks entries stale immediately —
  // one request may still see the old value (SWR) while the fresh read runs.
  // Admin editors are unaffected: this route's GET reads the table directly.
  revalidateTag(PAGE_CONTENT_TAG, 'max')
  return NextResponse.json({ success: true })
}
