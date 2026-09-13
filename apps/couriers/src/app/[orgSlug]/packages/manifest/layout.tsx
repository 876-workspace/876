import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ManifestListData } from './_components/manifest-list-data'
import { ManifestSection } from './_components/manifest-section'
import { MANIFEST_SKELETON_COLUMNS } from './_components/manifest-skeleton-columns'

export const metadata = { title: 'Manifests' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the manifest list for every route under
 * `/packages/manifest`, so a manifest opens beside the list instead of
 * replacing it. Awaits `params` only; the list streams behind its own boundary.
 */
export default async function ManifestsLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <ManifestSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={MANIFEST_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <ManifestListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </ManifestSection>
  )
}
