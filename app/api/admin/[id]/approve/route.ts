import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, sessionClaims } = await auth()

  if (!userId || sessionClaims?.metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  // Fetch the application
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('applications')
    .select('email, first_name, last_name')
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  // Send Clerk invitation
  const inviteRes = await fetch('https://api.clerk.com/v1/invitations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: application.email,
      redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://camp.glaum.ca'}/profile`,
      public_metadata: { applicationId: id, role: 'camper' },
    }),
  })

  if (!inviteRes.ok) {
    const err = await inviteRes.json()
    console.error('Clerk invite error:', err)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }

  // Mark application as approved
  const { error: updateError } = await supabaseAdmin
    .from('applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
