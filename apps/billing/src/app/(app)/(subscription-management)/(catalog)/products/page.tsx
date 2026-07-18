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
import { Page } from '@876/ui/page'
import { ProductsTable } from './products-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Products',
  description: 'Subscription products and families.',
}

const PRODUCT_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Products' },
  { value: 'active', label: 'Active', headingLabel: 'Active Products' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Products' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['active', 'inactive'].includes(status ?? '')
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'

  const context = await getWorkspaceContext()
  if (!context) return null

  const products = await service.products.list(context.tenant.id, filterStatus)

  return (
    <Page>
      <ResourceToolbar
        title="Products"
        titleFilter={
          <StatusFilterHeading
            label="Products"
            value={selectedStatus}
            options={PRODUCT_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('catalog:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('catalog:write')
            ? '/products/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

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
    </Page>
  )
}
