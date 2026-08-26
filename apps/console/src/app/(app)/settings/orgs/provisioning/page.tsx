import { Suspense } from 'react'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { workspace } from '@/lib/876'
import { ProvisioningNav } from './_components/provisioning-nav'
import { SETUPS_SKELETON_COLUMNS } from './_components/setups-skeleton-columns'

export const metadata = { title: 'Provisioning setups' }

export default function ProvisioningSetupsPage() {
  return (
    <Page className="space-y-6">
      <div>
        <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
        <ResourceToolbar
          title="Provisioning setups"
          primaryLabel="Add"
          primaryHref="/settings/orgs/provisioning/new"
          primaryVariant="info"
          refresh
        />
      </div>
      <div className="border-border border-b pb-px">
        <ProvisioningNav />
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={SETUPS_SKELETON_COLUMNS} />}
      >
        <SetupsTableData />
      </Suspense>
    </Page>
  )
}

async function SetupsTableData() {
  const result = await workspace.provisioning.setups.list()
  if (result.error || !result.data)
    throw new Error(
      result.error?.message ?? 'Failed to load provisioning setups.'
    )

  const setups = result.data.data

  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Setup</TableHead>
            <TableHead className="px-5 py-3.5">Country</TableHead>
            <TableHead className="px-5 py-3.5">Currency</TableHead>
            <TableHead className="px-5 py-3.5">Revision</TableHead>
            <TableHead className="px-5 py-3.5">Organizations</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {setups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground px-5 py-8 text-center text-[0.8125rem]"
              >
                No provisioning setups.
              </TableCell>
            </TableRow>
          ) : (
            setups.map((setup) => (
              <TableRow key={setup.id}>
                <TableCell className="px-5 py-3.5">
                  <Link
                    href={`/settings/orgs/provisioning/${encodeURIComponent(setup.key)}`}
                    className="font-medium hover:underline"
                  >
                    {setup.name}
                  </Link>
                  {setup.is_default ? (
                    <Badge variant="info" className="ml-2">
                      Default
                    </Badge>
                  ) : null}
                  <div className="text-muted-foreground font-mono text-xs">
                    {setup.key}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-3.5">
                  {setup.country_code ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground px-5 py-3.5">
                  {setup.currency_code ?? '—'}
                </TableCell>
                <TableCell className="px-5 py-3.5 tabular-nums">
                  {setup.published_revision ?? '—'}
                  {setup.has_draft ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      draft
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="px-5 py-3.5 tabular-nums">
                  {setup.organization_count}
                </TableCell>
                <TableCell className="px-5 py-3.5">
                  <Badge
                    variant={
                      setup.status === 'active' ? 'success' : 'secondary'
                    }
                  >
                    {setup.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
