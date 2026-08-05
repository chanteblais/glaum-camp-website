import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Deliberately unauthenticated: backs the kitchen board (public/kitchen.html),
// an unlinked page used by the caterer, who has no member account. The blast
// radius of an abusive write is confined to this single page_content key, the
// payload is shape- and size-checked, and the page is noindex + never linked.
const KEY = 'catering_kitchen_state'
const MAX_BYTES = 200_000

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('page_content')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let state: unknown = null
  if (data?.value) {
    try {
      state = JSON.parse(data.value)
    } catch {
      state = null
    }
  }
  return NextResponse.json({ state })
}

export async function PUT(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const state = (body as { state?: unknown } | null)?.state as
    | { groups?: unknown; pantry?: unknown }
    | undefined
  if (!state || typeof state !== 'object' || !Array.isArray(state.groups) || !Array.isArray(state.pantry)) {
    return NextResponse.json({ error: 'Unexpected shape' }, { status: 400 })
  }

  const value = JSON.stringify(state)
  if (value.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Too large' }, { status: 413 })
  }

  const { error } = await supabaseAdmin
    .from('page_content')
    .upsert({ key: KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// sendBeacon (the page's leave-flush) can only POST — same handler.
export async function POST(req: NextRequest) {
  return PUT(req)
}
