import { redirect } from 'next/navigation'

// The Participate page lives at /participate (renamed 2026-07-02). This stub
// keeps old bookmarks, emails, and attunement links working.
export default function SignupRedirect() {
  redirect('/participate')
}
