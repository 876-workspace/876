import Link from 'next/link'
import type { AdminProvisioningRunStatus } from '@876/admin'
import { buttonVariants } from '@876/ui/button'
import { Page } from '@876/ui/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { $876 } from '@/lib/876'
import { formatDateTime } from '@/lib/format'
import { ProvisioningNav } from '../provisioning-nav'
import { ReconcileRunsButton } from './run-actions'
import { RunStatus } from './run-status'

export const metadata = { title: 'Provisioning runs' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

const statuses = ['queued', 'processing', 'succeeded', 'failed'] as const

type Props = {
  searchParams: Promise<{
    status?: string
    app_id?: string
    organization_id?: string
    after?: string
  }>
}

function runStatus(value?: string): AdminProvisioningRunStatus | undefined {
  return statuses.find((status) => status === value)
}

export default async function ProvisioningRunsPage({ searchParams }: Props) {
  const query = await searchParams
  const status = runStatus(query.status)
  const appId = query.app_id?.trim() || undefined
  const organizationId = query.organization_id?.trim() || undefined
  const [runsResult, appsResult, organizationsResult] = await Promise.all([
    $876.provisioning.runs.list({
      status,
      app_id: appId,
      organization_id: organizationId,
      starting_after: query.after,
      limit: 50,
    }),
    $876.apps.list({ limit: 100 }),
    $876.orgs.list({ limit: 100 }),
  ])
  if (runsResult.error || !runsResult.data)
    throw new Error(
      runsResult.error?.message ?? 'Failed to load provisioning runs.'
    )
  const runs = runsResult.data.data
  const apps = appsResult.data?.data ?? []
  const appsById = new Map(apps.map((app) => [app.id, app]))
  const organizationsById = new Map(
    (organizationsResult.data?.data ?? []).map((organization) => [
      organization.id,
      organization,
    ])
  )

  return (
    <Page className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="876-eyebrow">Organizations</p>
          <h1 className="876-page-title mt-1">Provisioning run history</h1>
        </div>
        <ReconcileRunsButton appId={appId} organizationId={organizationId} />
      </div>
      <ProvisioningNav current="runs" />

      <form className="876-card grid gap-3 p-4 md:grid-cols-[180px_1fr_1fr_auto_auto]">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="border-input bg-background h-9 w-full rounded-md border px-3"
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Application</span>
          <select
            name="app_id"
            defaultValue={appId ?? ''}
            className="border-input bg-background h-9 w-full rounded-md border px-3"
          >
            <option value="">All applications</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Organization ID</span>
          <input
            name="organization_id"
            defaultValue={organizationId ?? ''}
            placeholder="org_…"
            className="border-input bg-background h-9 w-full rounded-md border px-3"
          />
        </label>
        <button className={buttonVariants({ className: 'self-end' })}>
          Apply filters
        </button>
        <Link
          href="/orgs/provisioning/runs"
          className={buttonVariants({
            variant: 'outline',
            className: 'self-end',
          })}
        >
          Clear
        </Link>
      </form>

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
            {runs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-28 text-center"
                >
                  No provisioning runs match these filters.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => {
                const app = appsById.get(run.app_id)
                const organization = organizationsById.get(run.organization_id)
                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <RunStatus status={run.status} />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {organization?.name ?? run.organization_id}
                      </p>
                      {organization ? (
                        <p className="text-muted-foreground text-xs">
                          {run.organization_id}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{app?.name ?? run.app_id}</p>
                      {app ? (
                        <p className="text-muted-foreground text-xs">
                          {app.slug}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize">
                      {run.trigger.replaceAll('_', ' ')}
                    </TableCell>
                    <TableCell>
                      F{run.finance_revision ?? '—'} · A
                      {run.application_revision ?? '—'}
                    </TableCell>
                    <TableCell>{run.attempt_count}</TableCell>
                    <TableCell>{formatDateTime(run.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/orgs/provisioning/runs/${encodeURIComponent(run.id)}`}
                        className={buttonVariants({
                          variant: 'ghost',
                          size: 'sm',
                        })}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </section>

      {runsResult.data.has_more && runs.at(-1) ? (
        <div className="flex justify-end">
          <Link
            href={{
              pathname: '/orgs/provisioning/runs',
              query: {
                ...(status ? { status } : {}),
                ...(appId ? { app_id: appId } : {}),
                ...(organizationId ? { organization_id: organizationId } : {}),
                after: runs.at(-1)!.id,
              },
            }}
            className={buttonVariants({ variant: 'outline' })}
          >
            Next page
          </Link>
        </div>
      ) : null}
    </Page>
  )
}
