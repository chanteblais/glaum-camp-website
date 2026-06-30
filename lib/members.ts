// Canonical member record helpers (Phase 1 of profile-as-source-of-truth).
//
// `members` is the identity record; `member_profiles.values` is the configurable
// profile JSONB keyed by registry field key (lib/profile-fields.ts). During the
// migration the app DUAL-WRITES here while still reading from `applications`, so
// every function below is GUARDED: a missing table or any error logs and returns
// a benign value rather than throwing — a failure must never break the primary
// application/profile flow. See docs/profile-architecture.md.

import { supabaseAdmin } from './supabase'

export type MemberRecord = {
  id: string
  clerk_user_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  pronouns: string | null
  phone: string | null
  avatar_url: string | null
  status: string | null
  application_id: string | null
}

const MEMBER_COLUMNS =
  'id, clerk_user_id, email, first_name, last_name, preferred_name, pronouns, phone, avatar_url, status, application_id'

export type MemberIdentity = Partial<Omit<MemberRecord, 'id' | 'clerk_user_id'>>

/** Find a member by clerk_user_id (preferred), falling back to email. */
export async function resolveMember(
  clerkUserId: string | null,
  email?: string | null,
): Promise<MemberRecord | null> {
  try {
    if (clerkUserId) {
      const { data } = await supabaseAdmin
        .from('members').select(MEMBER_COLUMNS)
        .eq('clerk_user_id', clerkUserId).maybeSingle()
      if (data) return data as MemberRecord
    }
    if (email) {
      const { data } = await supabaseAdmin
        .from('members').select(MEMBER_COLUMNS)
        .ilike('email', email).maybeSingle()
      if (data) return data as MemberRecord
    }
  } catch (e) {
    console.error('[members] resolveMember failed', e)
  }
  return null
}

/** The member's stored profile values (empty object when none). */
export async function getMemberProfileValues(memberId: string): Promise<Record<string, unknown>> {
  try {
    const { data } = await supabaseAdmin
      .from('member_profiles').select('values')
      .eq('member_id', memberId).maybeSingle()
    return (data?.values as Record<string, unknown>) ?? {}
  } catch (e) {
    console.error('[members] getMemberProfileValues failed', e)
    return {}
  }
}

/** Merge partial values into member_profiles.values (read-modify-write). */
export async function setProfileValues(
  memberId: string,
  partial: Record<string, unknown>,
): Promise<void> {
  try {
    const current = await getMemberProfileValues(memberId)
    const next = { ...current, ...partial }
    const { error } = await supabaseAdmin
      .from('member_profiles')
      .upsert([{ member_id: memberId, values: next, updated_at: new Date().toISOString() }], { onConflict: 'member_id' })
    if (error) console.error('[members] setProfileValues', error)
  } catch (e) {
    console.error('[members] setProfileValues failed', e)
  }
}

/**
 * Upsert a member (matched by clerk_user_id, else email), patching identity and
 * linking the clerk id if not yet set. Optionally seeds profile values. Returns
 * the member id, or null on failure. Guaranteed not to throw.
 */
export async function upsertMember(
  clerkUserId: string | null,
  identity: MemberIdentity,
  profileValues?: Record<string, unknown>,
): Promise<string | null> {
  try {
    const existing = await resolveMember(clerkUserId, identity.email ?? null)
    let memberId: string | null = existing?.id ?? null

    if (memberId) {
      const patch: Record<string, unknown> = { ...identity, updated_at: new Date().toISOString() }
      if (clerkUserId && !existing?.clerk_user_id) patch.clerk_user_id = clerkUserId
      const { error } = await supabaseAdmin.from('members').update(patch).eq('id', memberId)
      if (error) { console.error('[members] update', error); return null }
    } else {
      const { data, error } = await supabaseAdmin
        .from('members')
        .insert([{ clerk_user_id: clerkUserId, ...identity }])
        .select('id').single()
      if (error || !data) { console.error('[members] insert', error); return null }
      memberId = data.id as string
    }

    if (profileValues && Object.keys(profileValues).length > 0) {
      await setProfileValues(memberId, profileValues)
    } else {
      // Ensure a profile row exists even when there are no values yet.
      await supabaseAdmin
        .from('member_profiles')
        .upsert([{ member_id: memberId }], { onConflict: 'member_id', ignoreDuplicates: true })
    }
    return memberId
  } catch (e) {
    console.error('[members] upsertMember failed', e)
    return null
  }
}

/**
 * Mirror a status change onto the member record (matched by application_id, else
 * clerk_user_id). Used by the approve/reject/cancel flows during dual-write.
 */
export async function setMemberStatus(
  clerkUserId: string | null,
  applicationId: string | null,
  status: string,
): Promise<void> {
  try {
    const stamp = new Date().toISOString()
    if (applicationId) {
      const { error, count } = await supabaseAdmin
        .from('members').update({ status, updated_at: stamp }, { count: 'exact' })
        .eq('application_id', applicationId)
      if (!error && (count ?? 0) > 0) return
    }
    if (clerkUserId) {
      await supabaseAdmin
        .from('members').update({ status, updated_at: stamp })
        .eq('clerk_user_id', clerkUserId)
    }
  } catch (e) {
    console.error('[members] setMemberStatus failed', e)
  }
}
