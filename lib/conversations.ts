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
  muted: boolean
  groupId?: string
  otherUserId?: string // direct only
}

// Read/write a participant's per-conversation prefs (mute / email opt-in). The
// upsert only touches the supplied keys, so it never clobbers last_read_at.
export async function setParticipantPrefs(
  conversationId: string,
  userId: string,
  prefs: { muted?: boolean; email_opt_in?: boolean },
): Promise<void> {
  await supabaseAdmin.from('conversation_participants').upsert(
    { conversation_id: conversationId, clerk_user_id: userId, ...prefs },
    { onConflict: 'conversation_id,clerk_user_id' },
  )
}

export async function getParticipantPrefs(
  conversationId: string,
  userId: string,
): Promise<{ muted: boolean; email_opt_in: boolean }> {
  const { data } = await supabaseAdmin
    .from('conversation_participants')
    .select('muted, email_opt_in')
    .eq('conversation_id', conversationId)
    .eq('clerk_user_id', userId)
    .maybeSingle()
  return { muted: data?.muted ?? false, email_opt_in: data?.email_opt_in ?? false }
}

// Every conversation the user takes part in, with their read cursor.
// Direct conversations come from participant rows; group conversations are derived
// from group membership (the source of truth) so a newly added member sees their
// group even before a participant row exists.
export async function getMyConversations(userId: string): Promise<MyConversation[]> {
  // My participant rows and my group memberships are independent — fetch together.
  const [{ data: parts, error }, { data: myGroups }] = await Promise.all([
    supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at, muted')
      .eq('clerk_user_id', userId),
    supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('clerk_user_id', userId),
  ])
  if (error && error.code !== '42P01') throw error
  const lastReadByConv = new Map((parts ?? []).map(p => [p.conversation_id, p.last_read_at as string | null]))
  const mutedByConv = new Map((parts ?? []).map(p => [p.conversation_id, !!p.muted]))

  const partIds = (parts ?? []).map(p => p.conversation_id)
  const groupIds = (myGroups ?? []).map(g => g.group_id)

  // Resolve conversation rows — direct (from participant rows), group (from
  // membership), and the other participants of my conversations are all
  // independent of each other. The "others" query scans all my conversations
  // rather than just the direct ones (which aren't known yet) so it can join
  // this batch; only direct rows read from it below.
  const [directConvsRes, groupConvsRes, othersRes] = await Promise.all([
    partIds.length
      ? supabaseAdmin.from('conversations').select('id').eq('type', 'direct').in('id', partIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabaseAdmin.from('conversations').select('id, group_id').eq('type', 'group').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),
    partIds.length
      ? supabaseAdmin
          .from('conversation_participants')
          .select('conversation_id, clerk_user_id')
          .in('conversation_id', partIds)
          .neq('clerk_user_id', userId)
      : Promise.resolve({ data: [] }),
  ])

  const result: MyConversation[] = []

  // Direct conversations — resolve the other participant of each.
  const directIds = (directConvsRes.data ?? []).map(c => c.id)
  if (directIds.length) {
    const otherByConv = new Map((othersRes.data ?? []).map(o => [o.conversation_id, o.clerk_user_id]))
    for (const id of directIds) {
      result.push({ conversationId: id, type: 'direct', lastReadAt: lastReadByConv.get(id) ?? null, muted: mutedByConv.get(id) ?? false, otherUserId: otherByConv.get(id) })
    }
  }

  for (const gc of groupConvsRes.data ?? []) {
    result.push({ conversationId: gc.id, type: 'group', lastReadAt: lastReadByConv.get(gc.id) ?? null, muted: mutedByConv.get(gc.id) ?? false, groupId: gc.group_id as string })
  }

  return result
}

// Total unread across all of a user's conversations (direct + group): messages they
// didn't send, created after their per-conversation read cursor.
export async function getUnreadCount(userId: string): Promise<number> {
  const convs = (await getMyConversations(userId)).filter(c => !c.muted) // muted threads don't badge
  if (!convs.length) return 0

  const lastReadByConv = new Map(convs.map(c => [c.conversationId, c.lastReadAt]))
  // This runs on the nav's 30s unread poll — bound the scan to messages newer
  // than the oldest read cursor instead of every message ever, unless some
  // conversation has never been read (null cursor = everything counts).
  const cursors = convs.map(c => c.lastReadAt)
  const oldestCursor = cursors.every((c): c is string => !!c)
    ? cursors.reduce((a, b) => (a < b ? a : b))
    : null
  let query = supabaseAdmin
    .from('messages')
    .select('conversation_id, created_at')
    .in('conversation_id', convs.map(c => c.conversationId))
    .neq('sender_clerk_id', userId)
  if (oldestCursor) query = query.gt('created_at', oldestCursor)
  const { data: msgs } = await query
  if (!msgs?.length) return 0

  let count = 0
  for (const m of msgs) {
    const lr = lastReadByConv.get(m.conversation_id)
    if (!lr || new Date(m.created_at) > new Date(lr)) count++
  }
  return count
}
