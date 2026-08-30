'use client'

import { CreditCard } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { CrmCustomerRow } from './customers-table'

export function CustomerTransactionsTab({
  customer: _customer,
}: {
  customer: CrmCustomerRow
}) {
  const transactions: {
    id: string
    date: string
    description: string
    amount: string
    status: string
    method: string
  }[] = []

  return (
    <div className="space-y-4">
      {/* Transactions Table with Empty State */}
      <div className="border-876-surface-border overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Invoice
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Date
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Description
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Amount
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground px-4 py-12 text-center text-xs"
                >
                  <CreditCard className="text-muted-foreground/50 mx-auto mb-2 size-7" />
                  <p className="text-foreground font-medium">
                    No transactions recorded
                  </p>
                  <p className="mt-0.5 text-xs">
                    Invoices and payment records for this customer will appear
                    here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/40">
                  <TableCell className="px-4 py-3 font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
                    {tx.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                    {tx.date}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-3 text-xs">
                    <span className="font-medium">{tx.description}</span>
                    <span className="text-muted-foreground block text-[0.6875rem]">
                      {tx.method}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-3 text-right font-mono text-xs font-semibold">
                    {tx.amount}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs">
                    {tx.status}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
