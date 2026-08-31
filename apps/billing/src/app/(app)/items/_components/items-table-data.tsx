import Link from 'next/link'
import type { ComponentProps } from 'react'
import { CircleStackIcon } from '@876/ui/icons'
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

import { ItemsTable } from './items-table'

/** Data half of the persistent items list column. */
export async function ItemsTableData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const items = await service.items.list(context.tenant.id)

  return (
    <ItemsTable
      items={items as unknown as ComponentProps<typeof ItemsTable>['items']}
      defaultCurrency={context.tenant.defaultCurrency}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleStackIcon />
            </EmptyMedia>
            <EmptyTitle>No items yet</EmptyTitle>
            <EmptyDescription>
              Add the goods or services you expect to quote and invoice.
            </EmptyDescription>
          </EmptyHeader>
          {context.permissions.includes('catalog:write') ? (
            <EmptyContent>
              <Link
                href="/items/new"
                className={buttonVariants({ variant: 'info' })}
              >
                Add item
              </Link>
            </EmptyContent>
          ) : null}
        </Empty>
      }
    />
  )
}
