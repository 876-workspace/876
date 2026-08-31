import { workspace } from '@/lib/services/workspace'
import { platform } from '@/lib/services/platform'
import Image from 'next/image'
import Link from 'next/link'
import type { AdminProvisioningRunStatus } from '@876/platform/compat'
import { buttonVariants } from '@876/ui/button'
import { OrgAvatar } from '@876/ui/org-avatar'
import { Page } from '@876/ui/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { appColor } from '@/lib/app-color'
import { formatDateTime } from '@/lib/format'
import { ReconcileRunsButton } from '../_components/run-actions'
import { RunStatus } from '../_components/run-status'

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
    workspace.provisioning.runs.list({
      status,
      appId,
      organizationId,
      startingAfter: query.after,
      limit: 50,
    }),
    platform.apps.list({ limit: 100 }),
    platform.organizations.list({ limit: 100 }),
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
        <h1 className="876-page-title">Provisioning</h1>
        <ReconcileRunsButton appId={appId} organizationId={organizationId} />
      </div>

      <form className="876-card grid gap-3 p-4 md:grid-cols-[180px_1fr_1fr_auto_auto]">
        <label className="space-y-1 text-[0.8125rem]">
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
        <label className="space-y-1 text-[0.8125rem]">
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
        <label className="space-y-1 text-[0.8125rem]">
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
          href="/settings/orgs/provisioning/runs"
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
                const appLabel = app?.name ?? run.app_id
                const appKey = app?.slug ?? run.app_id
                const initial = appLabel.trim().charAt(0).toUpperCase() || 'A'

                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <RunStatus status={run.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <OrgAvatar
                          name={organization?.name ?? run.organization_id}
                          src={organization?.logo_url}
                          size="sm"
                        />
                        <div className="min-w-0">
                          {organization ? (
                            <Link
                              href={`/orgs/${organization.slug}`}
                              className="truncate font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              {organization.name}
                            </Link>
                          ) : (
                            <p className="truncate font-medium">
                              {run.organization_id}
                            </p>
                          )}
                          {organization ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {run.organization_id}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {app?.logo_url ? (
                          <Image
                            src={app.logo_url}
                            alt={app.name}
                            title={app.name}
                            width={20}
                            height={20}
                            unoptimized
                            className="size-5 shrink-0 rounded-sm object-cover"
                          />
                        ) : (
                          <span
                            title={appLabel}
                            aria-label={appLabel}
                            className={`inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold text-white ${appColor(appKey)}`}
                          >
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0">
                          {app ? (
                            <Link
                              href={`/apps/${app.slug}`}
                              className="truncate font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              {app.name}
                            </Link>
                          ) : (
                            <p className="truncate font-medium">{run.app_id}</p>
                          )}
                          {app ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {app.slug}
                            </p>
                          ) : null}
                        </div>
                      </div>
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
                        href={`/settings/orgs/provisioning/runs/${encodeURIComponent(run.id)}`}
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
              pathname: '/settings/orgs/provisioning/runs',
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
