import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatAmount, formatDate, type InvoiceRow } from '../_lib/invoice-row'

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No invoices yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.number}</TableCell>
              <TableCell>
                {invoice.customerName ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{invoice.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDate(invoice.dueAt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAmount(invoice.totalAmount, invoice.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
