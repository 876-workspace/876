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

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { ProductsList } from './products-list'

export async function ProductsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams
  const products = await service.products.list(context.tenant.id, undefined)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ProductsList
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
    </div>
  )
}
