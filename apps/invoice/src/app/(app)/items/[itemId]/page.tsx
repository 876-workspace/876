import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Badge } from '@876/ui/badge'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'
import { formatMoney } from '@/lib/format'
import { ItemActions } from './_components/item-actions'

interface Props {
  params: Promise<{ itemId: string }>
}

export const metadata: Metadata = {
  title: 'Item',
  description: 'Item details.',
}

export default async function ItemDetailPage({ params }: Props) {
  const { itemId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const $876 = await get876Client(context.orgId)
  const result = await $876.items.retrieve(itemId)

  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return (
      <Page>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Item unavailable</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Please try again shortly.
          </p>
        </div>
      </Page>
    )
  }

  const item = result.data
  const currency = item.defaultSellingCurrency ?? 'JMD'
  const canManage = context.role !== 'member'

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/items"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Items
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">{item.name}</span>
      </nav>

      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PageTitle>{item.name}</PageTitle>
              <Badge variant={item.isActive ? 'success' : 'secondary'}>
                {item.isActive ? 'Active' : 'Archived'}
              </Badge>
            </div>
            {item.description ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {item.description}
              </p>
            ) : null}
          </div>
          <ItemActions
            itemId={item.id}
            itemName={item.name}
            isActive={item.isActive}
            canManage={canManage}
          />
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="876-card divide-y">
          <div className="px-5 py-3">
            <span className="876-eyebrow">Item</span>
          </div>
          <dl className="divide-y">
            <FactRow label="Type" value={item.type === 'GOOD' ? 'Good' : 'Service'} />
            <FactRow label="SKU" value={item.sku ?? '—'} mono />
            <FactRow label="Unit" value={item.unit ?? '—'} />
            <FactRow label="Item ID" value={item.id} mono />
          </dl>
        </div>

        <div className="876-card divide-y">
          <div className="px-5 py-3">
            <span className="876-eyebrow">Billing</span>
          </div>
          <dl className="divide-y">
            <FactRow
              label="Default price"
              value={formatMoney(item.defaultSellingAmount, currency)}
              mono
            />
            <FactRow label="Currency" value={currency} mono />
            <FactRow label="Tax" value={item.isTaxable ? 'Taxable' : 'Non-taxable'} />
            <FactRow label="Tax code" value={item.taxCode ?? '—'} mono />
          </dl>
        </div>
      </div>
    </Page>
  )
}

function FactRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={['text-sm font-medium', mono ? 'tabular-nums' : ''].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
