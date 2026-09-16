import type { ReactNode } from 'react'

import { PortalNav } from '@/features/portal/components/portal-nav'
import { requirePortalAccess } from '@/lib/portal-access'

type Props = {
  children: ReactNode
  params: Promise<{ projectId: string }>
}

/**
 * Client-portal layout. Guarded by the signed-in session plus an active
 * client grant resolved through the portal client — never by
 * `projects.view` — so internal-only chrome and data stay out of reach.
 * Portal code uses `@876/projects/portal` only.
 */
export default async function PortalLayout({ children, params }: Props) {
  const { projectId } = await params
  await requirePortalAccess(decodeURIComponent(projectId))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12 sm:px-6">
      <header className="mb-6 space-y-3 border-b pb-4">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Client portal
        </p>
        <PortalNav projectId={decodeURIComponent(projectId)} />
      </header>
      {children}
    </div>
  )
}
