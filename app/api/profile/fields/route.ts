import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveMember, getMemberProfileValues, setProfileValues } from '@/lib/members'
import { parseProfileFields, storedFields, type ProfileField } from '@/lib/profile-fields'

// Member-facing read/write of registry-defined profile fields
// (member_profiles.values). Phase 4 of profile-as-source-of-truth.
//   GET   → { fields, values } the current member may see or edit.
//   PATCH → write values for memberEditable fields (validated against the registry).

async function loadStoredFields(): Promise<ProfileField[]> {
  const { data } = await supabaseAdmin
    .from('page_content').select('value')
    .eq('key', 'config_profile_fields').maybeSingle()
  return storedFields(parseProfileFields(data?.value))
}

// Coerce an incoming value to the shape its field type expects, dropping anything
// invalid (and, for selects, anything not in the allowed options).
function coerceValue(field: ProfileField, raw: unknown): unknown {
  switch (field.type) {
    case 'multi_select': {
      const arr = Array.isArray(raw) ? raw.map(String) : []
      return field.options?.length ? arr.filter(v => field.options!.includes(v)) : arr
    }
    case 'single_select': {
      const s = typeof raw === 'string' ? raw : ''
      return field.options?.length && !field.options.includes(s) ? '' : s
    }
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw)
      return Number.isFinite(n) ? n : null
    }
    case 'boolean':
      return raw === true || raw === 'true'
    default: // text, textarea, date
      return typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
  }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  const member = await resolveMember(userId, email)
  const values = member ? await getMemberProfileValues(member.id) : {}

  // Only expose fields the member can actually see (public) or edit.
  const fields = (await loadStoredFields()).filter(f => f.public || f.memberEditable)
  return NextResponse.json({ fields, values })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  const member = await resolveMember(userId, email)
  if (!member) return NextResponse.json({ error: 'No member profile found' }, { status: 404 })

  const body = (await req.json()) as Record<string, unknown>
  const editable = new Map(
    (await loadStoredFields()).filter(f => f.memberEditable).map(f => [f.key, f]),
  )

  const updates: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(body)) {
    const field = editable.get(key)
    if (!field) continue // ignore unknown / non-editable keys
    updates[key] = coerceValue(field, raw)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  await setProfileValues(member.id, updates)
  return NextResponse.json({ success: true })
}
