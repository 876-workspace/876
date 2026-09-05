'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

import { ProjectsToolbar } from './projects-toolbar'

export function ProjectsSection({ children }: { children: ReactNode }) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <div className="space-y-5">
      <ProjectsToolbar status={status} />
      {children}
    </div>
  )
}
