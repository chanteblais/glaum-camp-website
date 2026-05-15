/** Resolve the public origin for redirects. Prefer NEXT_PUBLIC_SITE_URL when sane; never trust localhost alone in deployed builds. */
export function resolveSiteOrigin(headerList: Headers): string {
  const configured =
    typeof process.env.NEXT_PUBLIC_SITE_URL === 'string'
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : ''

  if (configured && !configured.includes('localhost')) {
    return configured
  }

  const forwardedHost = headerList.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = headerList.get('x-forwarded-proto')
  const rawHost = forwardedHost || headerList.get('host') || ''
  const hostOnly = rawHost.split(':')[0] || ''

  // Prefer the actual request host (e.g. camp.glaum.ca) over VERCEL_URL (*.vercel.app),
  // especially when NEXT_PUBLIC_SITE_URL was wrongly set to localhost at build time.
  if (hostOnly && !hostOnly.includes('localhost')) {
    const protocol = forwardedProto || 'https'
    return `${protocol}://${rawHost.split(':')[0]}`
  }

  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
  }

  const host = rawHost || process.env.VERCEL_URL || 'localhost:3000'
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

/** Home URL passed to Clerk: absolute only when origin is non-localhost. */
export function clerkFallbackHome(origin: string): string {
  if (!origin.includes('localhost')) return `${origin.replace(/\/$/, '')}/`
  return '/'
}
