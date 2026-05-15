import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { headers } from 'next/headers'
import { clerkFallbackHome, resolveSiteOrigin } from '@/lib/site-origin'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
})

export const metadata: Metadata = {
  title: 'Glåüm @ What If 2026',
  description: 'Glåüm Theme Camp at What If 2026. Sponsored by Shrimp™. Find your attunement in the forest.',
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: ['/favicon/favicon.ico'],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const appHome = clerkFallbackHome(resolveSiteOrigin(headerList))

  return (
    <ClerkProvider
      afterSignOutUrl={appHome}
      signInFallbackRedirectUrl={appHome}
      signUpFallbackRedirectUrl={appHome}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <body
          className={libreBaskerville.variable}
          style={{ fontFamily: 'var(--font-libre-baskerville), Georgia, serif' }}
        >
          <div className="site-shell">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  )
}
