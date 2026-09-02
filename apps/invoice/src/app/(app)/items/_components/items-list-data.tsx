import { redirect } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { CircleStackIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoice } from '@/lib/invoice'
import { ItemsList } from './items-list'

function ItemsEmptyState() {
  return (
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
      <EmptyContent>
        <Link href="/items/new" className={buttonVariants({ variant: 'info' })}>
          New
        </Link>
      </EmptyContent>
    </Empty>
  )
}

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function ItemsListData() {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.items.list({})
  const items = result.error
    ? []
    : result.data.data.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        sku: item.sku,
        unit: item.unit,
        defaultSellingAmount: item.defaultSellingAmount,
        defaultSellingCurrency: item.defaultSellingCurrency,
        isTaxable: item.isTaxable,
        isActive: item.isActive,
      }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ItemsList
        items={items}
        defaultCurrency="JMD"
        emptyState={<ItemsEmptyState />}
      />
    </div>
  )
}
