import type { ReactNode } from 'react'

export function AppHeader({
  orgName,
  userEmail,
}: {
  orgName: string
  userEmail?: string
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="text-sm font-medium">{orgName}</div>
      <div className="text-muted-foreground text-sm">{userEmail}</div>
    </header>
  )
}
