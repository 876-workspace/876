'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { IssuesToolbar } from './issues-toolbar'

const TAKEOVER_SEGMENTS = ['new'] as const

export function IssuesSection({
  slug,
  list,
  children,
}: {
  slug: string
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={<IssuesToolbar slug={slug} status={status} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
