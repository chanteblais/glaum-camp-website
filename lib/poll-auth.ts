import { auth, clerkClient } from '@clerk/nextjs/server'

// Poll management is open to admins and to members an admin has granted the
// `canManagePolls` capability (see /api/admin/set-poll-manager). Returns the
// caller's userId when allowed, otherwise null.
export async function requirePollManager(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const meta = user.publicMetadata ?? {}
  if (meta.role === 'admin' || meta.canManagePolls === true) return userId
  return null
}
