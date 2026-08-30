'use client'

import { Button } from '@876/ui/button'
import { ArrowDownFromLine, Printer } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { CrmCustomerRow } from './customers-table'

export function CustomerStatementTab({
  customer: _customer,
}: {
  customer: CrmCustomerRow
}) {
  const ledger: {
    id: string
    date: string
    description: string
    ref: string
    debit: string
    credit: string
    balance: string
  }[] = []

  return (
    <div className="space-y-4">
      {/* Statement Summary Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-foreground text-[0.8125rem] font-semibold">
            Statement of Account
          </h3>
          <p className="text-muted-foreground text-xs">Account Ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <ArrowDownFromLine className="size-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-876-surface-border bg-muted/20 space-y-1 rounded-xl border p-3.5">
          <p className="text-muted-foreground text-[0.6875rem]">
            Opening Balance
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">—</p>
        </div>
        <div className="border-876-surface-border bg-muted/20 space-y-1 rounded-xl border p-3.5">
          <p className="text-muted-foreground text-[0.6875rem]">
            Total Invoiced
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">—</p>
        </div>
        <div className="border-876-surface-border bg-muted/20 space-y-1 rounded-xl border p-3.5">
          <p className="text-muted-foreground text-[0.6875rem]">Total Paid</p>
          <p className="text-foreground font-mono text-sm font-semibold">—</p>
        </div>
        <div className="border-876-surface-border bg-muted/20 space-y-1 rounded-xl border p-3.5">
          <p className="text-muted-foreground text-[0.6875rem]">
            Current Balance
          </p>
          <p className="text-foreground font-mono text-sm font-semibold">—</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border-876-surface-border overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Date
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Description
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Ref
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Debit
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Credit
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Balance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground px-4 py-10 text-center text-xs"
                >
                  No ledger line items recorded for this account.
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  <TableCell className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">
                    {row.date}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-2.5 text-xs font-medium">
                    {row.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-2.5 font-mono text-[0.6875rem]">
                    {row.ref}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-2.5 text-right font-mono text-xs">
                    {row.debit}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-2.5 text-right font-mono text-xs">
                    {row.credit}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-2.5 text-right font-mono text-xs font-semibold">
                    {row.balance}
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
