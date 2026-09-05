'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import { ProjectsToolbar } from './projects-toolbar'

export function ProjectsSection({
  orgSlug,
  children,
}: {
  orgSlug: string
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <div className="space-y-5">
      <ProjectsToolbar orgSlug={orgSlug} status={status} />
      {children}
    </div>
  )
}
