import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.publicMetadata?.role === 'admin' ? userId : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { decision } = await req.json() // 'approved' | 'rejected'

    const { data: suggestion, error: fetchError } = await supabaseAdmin
      .from('role_suggestions')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })

    if (decision === 'approved') {
      // Find or create the department
      let deptId: string

      const { data: existingDept } = await supabaseAdmin
        .from('departments')
        .select('id')
        .ilike('name', suggestion.dept_name)
        .maybeSingle()

      if (existingDept) {
        deptId = existingDept.id
      } else {
        const { data: newDept, error: deptError } = await supabaseAdmin
          .from('departments')
          .insert({ name: suggestion.dept_name, description: suggestion.dept_description ?? null })
          .select()
          .single()
        if (deptError) return NextResponse.json({ error: deptError.message }, { status: 500 })
        deptId = newDept.id
      }

      // Get current role count for sort_order
      const { count } = await supabaseAdmin
        .from('roles')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', deptId)

      // Create the role
      const { error: roleError } = await supabaseAdmin
        .from('roles')
        .insert({
          name: suggestion.role_name,
          description: suggestion.role_description ?? null,
          department_id: deptId,
          sort_order: count ?? 0,
        })

      if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 })

      // Notify the member
      await supabaseAdmin.from('user_notifications').insert({
        clerk_user_id: suggestion.clerk_user_id,
        message: 'Your role suggestion was approved',
        details: `"${suggestion.role_name}" has been added to the ${suggestion.dept_name} department and is now available to select.`,
      })
    } else {
      // Notify the member of rejection
      await supabaseAdmin.from('user_notifications').insert({
        clerk_user_id: suggestion.clerk_user_id,
        message: 'Your role suggestion was reviewed',
        details: `Your suggestion for "${suggestion.role_name}" was not added at this time. Reach out to an organiser if you have questions.`,
      })
    }

    // Update suggestion status
    await supabaseAdmin
      .from('role_suggestions')
      .update({ status: decision })
      .eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/admin/role-suggestions/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
