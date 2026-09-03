import { Suspense, type ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { ensurePlatformProjectsWorkspace } from '@/lib/platform-org'

/**
 * Prepares 876's own Projects tenant. It renders nothing and no page reads its
 * result, so it sits behind its own boundary: a layout that awaited it would
 * suspend into the *parent* segment and land every `/projects` click on the
 * previous screen (`.claude/rules/navigation-performance.md` §2).
 */
async function PlatformProjectsWorkspace() {
  await ensurePlatformProjectsWorkspace()
  return null
}

export default async function ProjectsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/projects')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/projects'])

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PlatformProjectsWorkspace />
      </Suspense>
    </>
  )
}
