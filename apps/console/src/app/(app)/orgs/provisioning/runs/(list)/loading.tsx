import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { ProvisioningNav } from '@/app/(app)/orgs/provisioning/_components/provisioning-nav'

/**
 * The runs page resolves its filters and its table from the same top-level
 * await, so it needs a boundary of its own now that `/orgs` no longer carries a
 * segment-level one. Everything that is known without fetching — the heading,
 * the section nav, the table's column labels — renders for real.
 */
export default function Loading() {
  return (
    <Page className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="876-eyebrow">Organizations</p>
          <h1 className="876-page-title mt-1">Provisioning run history</h1>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <ProvisioningNav current="runs" />

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
