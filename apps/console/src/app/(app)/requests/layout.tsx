import { Suspense, type ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { ensurePlatformRequestWorkspace } from '@/lib/platform-org'

/**
 * Prepares 876's own CRM service workspace. It renders nothing and nothing on
 * this page reads its result, so it sits behind its own boundary: a layout that
 * awaited it would suspend into the *parent* segment and land every `/requests`
 * click on the previous screen (`.claude/rules/navigation-performance.md` §2).
 */
async function PlatformRequestWorkspace() {
  await ensurePlatformRequestWorkspace()
  return null
}

export default async function RequestsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/requests')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/requests'])

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PlatformRequestWorkspace />
      </Suspense>
    </>
  )
}
