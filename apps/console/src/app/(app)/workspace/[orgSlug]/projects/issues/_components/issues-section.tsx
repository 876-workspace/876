'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import { IssuesToolbar } from './issues-toolbar'

export function IssuesSection({
  orgSlug,
  children,
}: {
  orgSlug: string
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <div className="space-y-5">
      <IssuesToolbar orgSlug={orgSlug} status={status} />
      {children}
    </div>
  )
}
