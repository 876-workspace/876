import { CircleStackIcon } from '@876/ui/icons'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ProductsTable } from '../_components/products-table'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourcePage } from '@/components/patterns/streaming-resource-page'
import { service } from '@/lib/service'
import {
  CATALOG_LISTS,
  parseCatalogStatus,
} from '../../_components/catalog-list-config'

export const metadata = {
  title: 'Products',
  description: 'Subscription products and families.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = parseCatalogStatus(status)
  return (
    <StreamingResourcePage {...CATALOG_LISTS.products} status={selectedStatus}>
      <ProductsPageData selectedStatus={selectedStatus} />
    </StreamingResourcePage>
  )
}

async function ProductsPageData({
  selectedStatus,
}: {
  selectedStatus: string
}) {
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const products = await service.products.list(context.tenant.id, filterStatus)

  return (
    <ProductsTable
      products={products}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleStackIcon />
            </EmptyMedia>
            <EmptyTitle>No products yet</EmptyTitle>
            <EmptyDescription>
              Create a product before configuring subscription plans.
            </EmptyDescription>
          </EmptyHeader>
          {context.permissions.includes('catalog:write') ? (
            <EmptyContent>
              <Link
                href="/products/new"
                className={buttonVariants({ variant: 'info' })}
              >
                Add product
              </Link>
            </EmptyContent>
          ) : null}
        </Empty>
      }
    />
  )
}
