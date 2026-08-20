import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { ProvisioningNav } from '../../_components/provisioning-nav'

export default function Loading() {
  return (
    <Page className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
          <h1 className="876-page-title">Provisioning</h1>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border-border border-b pb-px">
        <ProvisioningNav />
      </div>

      <Skeleton className="h-[86px] w-full rounded-lg" />

      <section className="876-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Revisions</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }, (_, row) => (
              <TableRow key={row}>
                {Array.from({ length: 8 }, (_, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </Page>
  )
}
