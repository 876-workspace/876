import { Badge } from '@876/ui/badge'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'

const ITEM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function ItemsPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'
  const active =
    selectedStatus === 'all' ? undefined : selectedStatus === 'active'
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const items = await finance.items.list(ctx.orgId, { active })

  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value={selectedStatus}
            options={ITEM_STATUS_OPTIONS}
          />
        }
        refresh
      />

      {items.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {items.error.message}
        </div>
      ) : items.data.data.length === 0 ? (
        <div className="876-empty-dashed">No shared catalog items.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Default price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.data.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-5">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {item.sku ?? item.description ?? item.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.type === 'SERVICE' ? 'Service' : 'Good'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.source ? 'Connected app' : 'Billing workspace'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'secondary' : 'outline'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right font-medium tabular-nums">
                    {formatPrice(
                      item.defaultSellingAmount,
                      item.defaultSellingCurrency
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}

function formatPrice(amount: string | null, currency: string | null): string {
  if (amount === null || currency === null) return '—'

  const numeric = Number(amount)
  if (!Number.isSafeInteger(numeric)) return `${currency} ${amount}`

  const formatter = new Intl.NumberFormat('en-JM', {
    style: 'currency',
    currency,
  })
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2

  return formatter.format(numeric / 10 ** exponent)
}
