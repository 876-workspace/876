import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
export const metadata: Metadata = {
  title: { default: '876 Commerce', template: '%s | 876 Commerce' },
  description: '876 Commerce organization workspace.',
  robots: { index: false, follow: false },
}
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
