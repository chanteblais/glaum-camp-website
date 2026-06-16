import type { Metadata } from 'next'
import { Libre_Baskerville, Marcellus, Cormorant_Garamond } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { headers } from 'next/headers'
import { clerkFallbackHome, resolveSiteOrigin } from '@/lib/site-origin'
import { SITE_NAME, EVENT_NAME, SITE_DESCRIPTION } from '@/lib/site-config'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
})

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-marcellus',
})

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant-garamond',
})

export const metadata: Metadata = {
  title: `${SITE_NAME} @ ${EVENT_NAME}`,
  description: SITE_DESCRIPTION,
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
      signInUrl="/sign-in"
    >
      <html lang="en">
        <body
          className={`${libreBaskerville.variable} ${marcellus.variable} ${cormorantGaramond.variable}`}
          style={{ fontFamily: 'var(--font-libre-baskerville), Georgia, serif' }}
        >
          <div className="site-shell">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  )
}
