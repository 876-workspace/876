'use client'

import { Badge } from '@876/ui/badge'
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
  customer,
}: {
  customer: CrmCustomerRow
}) {
  const requests = [
    {
      id: 'REQ-8921',
      title: 'Tax exemption certificate & invoice currency update',
      status: 'IN_PROGRESS',
      statusLabel: 'In Progress',
      priority: 'High',
      priorityVariant: 'destructive' as const,
      assignee: 'Marcus Sterling',
      updatedAt: '2 hours ago',
    },
    {
      id: 'REQ-8840',
      title: 'Webhook endpoint re-configuration for dispatch updates',
      status: 'RESOLVED',
      statusLabel: 'Resolved',
      priority: 'Medium',
      priorityVariant: 'secondary' as const,
      assignee: 'Devon Campbell',
      updatedAt: 'Aug 15, 2026',
    },
    {
      id: 'REQ-8712',
      title: 'Annual account plan review & tier upgrade',
      status: 'RESOLVED',
      statusLabel: 'Resolved',
      priority: 'Normal',
      priorityVariant: 'secondary' as const,
      assignee: 'Althea Morgan',
      updatedAt: 'Jul 02, 2026',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-[0.8125rem] font-semibold">
            Support & Service Requests ({requests.length})
          </h3>
        </div>
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
            {requests.map((req) => (
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
                  <Badge variant="outline" className="text-[0.625rem]">
                    {req.priority}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    variant={req.status === 'RESOLVED' ? 'secondary' : 'info'}
                    className="text-[0.625rem]"
                  >
                    {req.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground px-4 py-3 text-right text-xs">
                  {req.assignee}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
