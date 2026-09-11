import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { OrgsSection } from './_components/orgs-section'

/**
 * Owns the toolbar, search, and the organization list for every route under
 * `/orgs`.
 *
 * Keeping them here — rather than in each page — is what lets an organization
 * open beside the list instead of replacing it, and what keeps the list column
 * a single element across open and close so its width can animate.
 */
export default async function OrgsLayout({
  children,
  list,
}: {
  children: ReactNode
  list: ReactNode
}) {
  const sessionUser = await requireSession('/orgs')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/orgs'])

  return <OrgsSection list={list}>{children}</OrgsSection>
}
