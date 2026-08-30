'use client'

import { Badge } from '@876/ui/badge'
import { CreditCard, ReceiptText } from '@876/ui/icons'
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
  customer,
}: {
  customer: CrmCustomerRow
}) {
  const transactions = [
    {
      id: 'INV-2026-003',
      date: 'Aug 24, 2026',
      description: 'Platform Subscription & API Add-on',
      amount: '$5,800.00',
      status: 'PAID',
      method: 'Bank Transfer',
    },
    {
      id: 'INV-2026-002',
      date: 'Jul 12, 2026',
      description: 'Monthly Platform Subscription (Enterprise Tier)',
      amount: '$4,500.00',
      status: 'PAID',
      method: 'Card •••• 4242',
    },
    {
      id: 'INV-2026-001',
      date: 'Jun 10, 2026',
      description: 'Initial CRM Setup & Integration Fee',
      amount: '$4,500.00',
      status: 'PAID',
      method: 'Card •••• 4242',
    },
  ]

  const totalSpent = '$14,800.00'

  return (
    <div className="space-y-4">
      {/* Summary Stat */}
      <div className="border-876-surface-border bg-muted/20 flex items-center justify-between rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
            <CreditCard className="size-4.5" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Total Invoiced
            </p>
            <p className="text-foreground text-base font-semibold">
              {totalSpent}
            </p>
          </div>
        </div>
        <Badge variant="success" className="text-xs font-medium">
          Account in Good Standing
        </Badge>
      </div>

      {/* Transactions Table */}
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
            {transactions.map((tx) => (
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
                <TableCell className="px-4 py-3 text-right">
                  <Badge variant="success" className="text-[0.625rem]">
                    Paid
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
