import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'
import { RolesListData } from './_components/roles-list-data'
import { RolesSection } from './_components/roles-section'

/**
 * Owns the toolbar and the role list for every route under
 * `/settings/users/roles`.
 *
 * Keeping them here — rather than in each page — is what lets a role open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default async function RolesLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <RolesSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />
            </div>
          }
        >
          <RolesListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </RolesSection>
  )
}
