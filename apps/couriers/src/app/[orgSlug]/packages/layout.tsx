import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PackagesListData } from './_components/packages-list-data'
import { PackagesSection } from './_components/packages-section'
import { PACKAGES_SKELETON_COLUMNS } from './_components/packages-skeleton-columns'

export const metadata = { title: 'Packages' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function PackagesLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <PackagesSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={PACKAGES_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
          }
        >
          <PackagesListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </PackagesSection>
  )
}
