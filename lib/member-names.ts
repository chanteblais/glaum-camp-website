import { supabaseAdmin } from './supabase'

// clerk_user_id → display name from the canonical members record
// (preferred name wins over first name; last name appended when present).
// Used wherever a signup row must surface as a person, e.g. "Led by …".
// Ids with no member row or no name are simply absent from the result.
export async function memberDisplayNames(clerkUserIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(clerkUserIds.filter(Boolean)))
  if (ids.length === 0) return {}
  const { data } = await supabaseAdmin
    .from('members')
    .select('clerk_user_id, first_name, last_name, preferred_name')
    .in('clerk_user_id', ids)
  const names: Record<string, string> = {}
  for (const m of data ?? []) {
    if (!m.clerk_user_id) continue
    const name = [m.preferred_name || m.first_name, m.last_name].filter(Boolean).join(' ').trim()
    if (name) names[m.clerk_user_id] = name
  }
  return names
}
