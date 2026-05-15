import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
})

export const metadata: Metadata = {
  title: 'Glåüm @ What If 2026',
  description: 'Glåüm Theme Camp at What If 2026. Sponsored by Shrimp™. Find your attunement in the forest.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
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
