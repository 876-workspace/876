import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { DetailField } from '@/components/detail-field'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export default async function PriceListDetailPage({
  params,
}: {
  params: Promise<{ priceListId: string }>
}) {
  const { priceListId } = await params
  const context = await requirePagePermission('catalog:read')
  const list = await service.priceLists.retrieve(context.tenant.id, priceListId)
  if (!list) notFound()
  return (
    <Page>
      <PageBreadcrumb
        href="/price-lists"
        label="Price Lists"
        className="mb-4"
      />
      <PageHeader className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <PageTitle>{list.name}</PageTitle>
            <Badge variant={list.isActive ? 'success' : 'secondary'}>
              {list.isActive ? 'Active' : 'Archived'}
            </Badge>
          </div>
          <PageDescription>
            {list.description ?? 'Reusable catalog pricing policy.'}
          </PageDescription>
        </div>
        {context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="price-list"
            resourceId={list.id}
            resourceName={list.name}
            isActive={list.isActive}
            returnHref="/price-lists"
            editHref={`/price-lists/${list.id}/edit`}
          />
        ) : null}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Configuration</h2>
          <dl className="divide-876-surface-border divide-y">
            <DetailField label="Mode" value={list.mode.toLowerCase()} />
            <DetailField
              label="Adjustment"
              value={
                list.mode === 'PERCENTAGE'
                  ? `${list.percentage?.toString()}% ${list.direction?.toLowerCase()}`
                  : (list.currency ?? '—')
              }
            />
            <DetailField
              label="Rounding"
              value={`${list.rounding.toLowerCase()} (${list.roundingPrecision} decimals)`}
            />
            <DetailField
              label="Customers"
              value={String(list._count.customers)}
            />
            <DetailField label="Updated" value={formatDate(list.updatedAt)} />
          </dl>
        </section>
        <section className="876-card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="876-section-title">Custom prices</h2>
          </div>
          {list.entries.length ? (
            <div className="divide-y">
              {list.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {entry.price.item?.name ??
                        entry.price.plan?.name ??
                        entry.price.addon?.name ??
                        entry.price.nickname ??
                        entry.price.id}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {entry.tiers.length
                        ? `${entry.tiers.length} volume ranges`
                        : 'Individual rate'}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatMoney(
                      entry.unitAmount,
                      list.currency ?? entry.price.currency
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground p-5 text-sm">
              Percentage rules apply to every active catalog price.
            </p>
          )}
        </section>
      </div>
    </Page>
  )
}
