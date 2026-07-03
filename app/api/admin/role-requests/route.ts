import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: signups, error } = await supabaseAdmin
    .from('camp_signups')
    .select('clerk_user_id, role_id, role_approval_status, updated_at')
    .eq('role_approval_status', 'pending')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!signups?.length) return NextResponse.json({ requests: [] })

  // Fetch roles + departments
  const roleIds = Array.from(new Set(signups.map(s => s.role_id).filter(Boolean)))
  const { data: roles } = await supabaseAdmin
    .from('roles')
    .select('id, name, department_id, departments(name, icon)')
    .in('id', roleIds)

  // Applicant names from the canonical members table (Phase 5).
  const userIds = signups.map(s => s.clerk_user_id)
  const { data: applications } = await supabaseAdmin
    .from('members')
    .select('clerk_user_id, first_name, last_name, preferred_name')
    .in('clerk_user_id', userIds)

  const roleMap = Object.fromEntries((roles ?? []).map(r => [r.id, r]))
  const appMap = Object.fromEntries((applications ?? []).map(a => [a.clerk_user_id, a]))

  const requests = signups.map(s => {
    const role = roleMap[s.role_id]
    const app = appMap[s.clerk_user_id]
    const dept = role?.departments as { name: string; icon: string | null } | null
    return {
      clerk_user_id: s.clerk_user_id,
      role_id: s.role_id,
      role_name: role?.name ?? 'Unknown role',
      department_name: dept?.name ?? null,
      department_icon: dept?.icon ?? null,
      applicant_name: app?.preferred_name ?? app?.first_name ?? 'Unknown',
      applicant_full_name: `${app?.first_name ?? ''} ${app?.last_name ?? ''}`.trim(),
      requested_at: s.updated_at,
    }
  })

  return NextResponse.json({ requests })
}
