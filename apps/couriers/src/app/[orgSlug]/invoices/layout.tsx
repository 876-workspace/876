import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { INVOICES_SKELETON_COLUMNS } from './_components/invoices-skeleton-columns'
import { InvoicesListData } from './_components/invoices-list-data'
import { InvoicesSection } from './_components/invoices-section'

export const metadata = { title: 'Invoices' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the invoice list for every route under `/invoices`,
 * so an invoice opens beside the list instead of replacing it. Awaits `params`
 * only; the list streams behind its own boundary.
 */
export default async function InvoicesLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <InvoicesSection
      orgSlug={orgSlug}
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={INVOICES_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <InvoicesListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </InvoicesSection>
  )
}
