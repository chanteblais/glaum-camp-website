import { SignUp } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { clerkAppearance } from '@/lib/clerk-appearance'

export default async function SignUpPage() {
  const { userId } = await auth()
  if (userId) redirect('/apply')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
      <SignUp
        routing="path"
        path="/sign-up"
        forceRedirectUrl="/apply"
        fallbackRedirectUrl="/apply"
        signInUrl="/sign-in"
        appearance={clerkAppearance}
      />
    </div>
  )
}
