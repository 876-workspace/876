'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import { IssuesToolbar } from './issues-toolbar'

export function IssuesSection({ children }: { children: ReactNode }) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <div className="space-y-5">
      <IssuesToolbar status={status} />
      {children}
    </div>
  )
}
