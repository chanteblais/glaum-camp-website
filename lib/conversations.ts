import { supabaseAdmin } from './supabase'

// Helpers for the conversations model (group messaging — see docs/group-messaging.md).
// Phase 2 uses these to back the existing 1:1 DM endpoints; group threads come later.

// Stable key for a direct (1:1) conversation: the two clerk ids, sorted and joined.
// Mirrors the `direct_key` column + its unique index, so each unordered pair maps to
// exactly one conversation.
export function directKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

// Find the existing direct conversation between two users, or null. Does not create.
export async function findDirectConversation(a: string, b: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('direct_key', directKey(a, b))
    .maybeSingle()
  return data?.id ?? null
}

// Resolve-or-create the direct conversation between two users, ensuring both are
// participants. Idempotent and race-safe (the unique index on direct_key is the
// source of truth).
export async function getOrCreateDirectConversation(a: string, b: string): Promise<string> {
  const key = directKey(a, b)

  const existing = await findDirectConversation(a, b)
  let convId: string

  if (existing) {
    convId = existing
  } else {
    const { data: created, error } = await supabaseAdmin
      .from('conversations')
      .insert({ type: 'direct', direct_key: key })
      .select('id')
      .single()
    if (error) {
      // Likely a concurrent insert hit the unique index first — re-read.
      const again = await findDirectConversation(a, b)
      if (!again) throw error
      convId = again
    } else {
      convId = created.id
    }
  }

  // Ensure both participants exist; never clobber existing last_read_at.
  await supabaseAdmin.from('conversation_participants').upsert(
    [
      { conversation_id: convId, clerk_user_id: a },
      { conversation_id: convId, clerk_user_id: b },
    ],
    { onConflict: 'conversation_id,clerk_user_id', ignoreDuplicates: true },
  )

  return convId
}

// ── Group conversation helpers ───────────────────────────────────────────────

// The conversation bound to a group, or null. (One per group.)
export async function findGroupConversation(groupId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('type', 'group')
    .eq('group_id', groupId)
    .maybeSingle()
  return data?.id ?? null
}

// The group's conversation, creating it if missing. Used on group creation and as
// a fallback on thread access (existing groups got theirs in migration 033).
export async function getOrCreateGroupConversation(groupId: string): Promise<string> {
  const existing = await findGroupConversation(groupId)
  if (existing) return existing
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({ type: 'group', group_id: groupId })
    .select('id')
    .single()
  if (error) {
    const again = await findGroupConversation(groupId)
    if (!again) throw error
    return again
  }
  return data.id
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('group_members')
    .select('clerk_user_id')
    .eq('group_id', groupId)
    .eq('clerk_user_id', userId)
    .maybeSingle()
  return !!data
}

// Advance a user's read cursor to now, creating their participant row if needed
// (group participant rows are created lazily on first read/post). Only sets
// last_read_at — muted / email_opt_in keep their existing values on conflict.
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabaseAdmin.from('conversation_participants').upsert(
    { conversation_id: conversationId, clerk_user_id: userId, last_read_at: new Date().toISOString() },
    { onConflict: 'conversation_id,clerk_user_id' },
  )
}

// ── My conversations ─────────────────────────────────────────────────────────

export type MyConversation = {
  conversationId: string
  type: 'direct' | 'group'
  lastReadAt: string | null
  groupId?: string
  otherUserId?: string // direct only
}

// Every conversation the user takes part in, with their read cursor.
// Direct conversations come from participant rows; group conversations are derived
// from group membership (the source of truth) so a newly added member sees their
// group even before a participant row exists.
export async function getMyConversations(userId: string): Promise<MyConversation[]> {
  const { data: parts, error } = await supabaseAdmin
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('clerk_user_id', userId)
  if (error && error.code !== '42P01') throw error
  const lastReadByConv = new Map((parts ?? []).map(p => [p.conversation_id, p.last_read_at as string | null]))

  const result: MyConversation[] = []

  // Direct conversations — from my participant rows, filtered to type='direct'.
  const partIds = (parts ?? []).map(p => p.conversation_id)
  if (partIds.length) {
    const { data: directConvs } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('type', 'direct')
      .in('id', partIds)
    const directIds = (directConvs ?? []).map(c => c.id)
    if (directIds.length) {
      const { data: others } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, clerk_user_id')
        .in('conversation_id', directIds)
        .neq('clerk_user_id', userId)
      const otherByConv = new Map((others ?? []).map(o => [o.conversation_id, o.clerk_user_id]))
      for (const id of directIds) {
        result.push({ conversationId: id, type: 'direct', lastReadAt: lastReadByConv.get(id) ?? null, otherUserId: otherByConv.get(id) })
      }
    }
  }

  // Group conversations — derived from group membership.
  const { data: myGroups } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('clerk_user_id', userId)
  const groupIds = (myGroups ?? []).map(g => g.group_id)
  if (groupIds.length) {
    const { data: groupConvs } = await supabaseAdmin
      .from('conversations')
      .select('id, group_id')
      .eq('type', 'group')
      .in('group_id', groupIds)
    for (const gc of groupConvs ?? []) {
      result.push({ conversationId: gc.id, type: 'group', lastReadAt: lastReadByConv.get(gc.id) ?? null, groupId: gc.group_id as string })
    }
  }

  return result
}

// Total unread across all of a user's conversations (direct + group): messages they
// didn't send, created after their per-conversation read cursor.
export async function getUnreadCount(userId: string): Promise<number> {
  const convs = await getMyConversations(userId)
  if (!convs.length) return 0

  const lastReadByConv = new Map(convs.map(c => [c.conversationId, c.lastReadAt]))
  const { data: msgs } = await supabaseAdmin
    .from('messages')
    .select('conversation_id, created_at')
    .in('conversation_id', convs.map(c => c.conversationId))
    .neq('sender_clerk_id', userId)
  if (!msgs?.length) return 0

  let count = 0
  for (const m of msgs) {
    const lr = lastReadByConv.get(m.conversation_id)
    if (!lr || new Date(m.created_at) > new Date(lr)) count++
  }
  return count
}
