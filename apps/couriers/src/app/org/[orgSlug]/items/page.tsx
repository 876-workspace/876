import { Badge } from '@876/ui/badge'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'

export default async function ItemsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const items = await finance.items.list(ctx.orgId)

  return (
    <Page>
      <PageHeader className="mb-8">
        <PageTitle>Items</PageTitle>
        <PageDescription>
          One shared catalog for Courier charges, invoices, and every connected
          876 product.
        </PageDescription>
      </PageHeader>

      {items.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {items.error.message}
        </div>
      ) : items.data.data.length === 0 ? (
        <div className="876-empty-dashed">
          No shared catalog items in this finance workspace yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
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
