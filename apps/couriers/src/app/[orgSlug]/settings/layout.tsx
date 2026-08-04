import type { ReactNode } from 'react'

export const metadata = { title: 'Settings' }

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
