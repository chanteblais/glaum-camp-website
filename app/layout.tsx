import type { Metadata } from 'next'
import { Libre_Baskerville } from 'next/font/google'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
})

export const metadata: Metadata = {
  title: 'Glåüm @ What If 2026',
  description: 'Glåüm Theme Camp at What If 2026. Sponsored by Shrimp™. Find your attunement in the forest.',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${libreBaskerville.variable} font-[var(--font-libre-baskerville)]`} style={{ fontFamily: 'var(--font-libre-baskerville), Georgia, serif' }}>
        {children}
      </body>
    </html>
  )
}
