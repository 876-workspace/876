import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { UsersSection } from './_components/users-section'

/**
 * Owns the toolbar, search, and the user list for every route under `/users`.
 *
 * Keeping them here — rather than in each page — is what lets a user open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function UsersLayout({
  children,
  list,
}: {
  children: ReactNode
  list: ReactNode
}) {
  const sessionUser = await requireSession('/users')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/users'])

  return <UsersSection list={list}>{children}</UsersSection>
}
