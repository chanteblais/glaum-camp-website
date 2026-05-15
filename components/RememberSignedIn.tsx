'use client'

import { useEffect } from 'react'

type RememberSignedInProps = {
  firstName?: string | null
  email?: string | null
}

export function RememberSignedIn({ firstName, email }: RememberSignedInProps) {
  useEffect(() => {
    window.localStorage.setItem('glaum-auth-signed-in', 'true')
    if (firstName) window.localStorage.setItem('glaum-auth-first-name', firstName)
    if (email) window.localStorage.setItem('glaum-auth-email', email)
  }, [firstName, email])

  return null
}
