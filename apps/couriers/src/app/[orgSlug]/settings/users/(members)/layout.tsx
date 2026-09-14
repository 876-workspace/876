import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { UsersListData } from '../_components/users-list-data'
import { UsersSection } from '../_components/users-section'
import { USERS_SKELETON_COLUMNS } from '../_components/users-skeleton-columns'
import { listInviteRoleOptions } from '../_lib/team-members'

/**
 * Owns the toolbar and the member list for every member route under
 * `/settings/users`.
 *
 * Keeping them here — rather than in each page — is what lets a member open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function MembersLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const inviteRoles = await listInviteRoleOptions(orgSlug)

  return (
    <UsersSection
      orgSlug={orgSlug}
      roles={inviteRoles}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
            </div>
          }
        >
          <UsersListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </UsersSection>
  )
}
