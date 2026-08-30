'use client'

import { Button } from '@876/ui/button'
import { ClipboardList, Plus } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { CrmCustomerRow } from './customers-table'

export function CustomerRequestsTab({
  customer: _customer,
}: {
  customer: CrmCustomerRow
}) {
  const requests: {
    id: string
    title: string
    status: string
    statusLabel: string
    priority: string
    assignee: string
    updatedAt: string
  }[] = []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-[0.8125rem] font-semibold">
          Support & Service Requests ({requests.length})
        </h3>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          New Request
        </Button>
      </div>

      <div className="border-876-surface-border overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Request
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Title
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Priority
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold">
                Status
              </TableHead>
              <TableHead className="px-4 py-2.5 text-right text-xs font-semibold">
                Assignee
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground px-4 py-12 text-center text-xs"
                >
                  <ClipboardList className="text-muted-foreground/50 mx-auto mb-2 size-7" />
                  <p className="text-foreground font-medium">
                    No requests recorded
                  </p>
                  <p className="mt-0.5 text-xs">
                    Support and service requests for this customer will appear
                    here.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/40">
                  <TableCell className="px-4 py-3 font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
                    {req.id}
                  </TableCell>
                  <TableCell className="text-foreground px-4 py-3 text-xs">
                    <span className="font-medium">{req.title}</span>
                    <span className="text-muted-foreground block text-[0.6875rem]">
                      Updated {req.updatedAt}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    {req.priority}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    {req.statusLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 py-3 text-right text-xs">
                    {req.assignee}
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
