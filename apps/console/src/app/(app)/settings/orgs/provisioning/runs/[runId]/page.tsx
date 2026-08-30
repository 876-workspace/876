import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { OrgAvatar } from '@876/ui/org-avatar'
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

import { $876, workspace } from '@/lib/876'
import { appColor } from '@/lib/app-color'
import { formatDateTime } from '@/lib/format'
import { RetryRunButton } from '../_components/run-actions'
import { RunStatus } from '../_components/run-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ runId: string }> }

export default function ProvisioningRunPage({ params }: Props) {
  return (
    <Page className="space-y-6">
      <PageBreadcrumb
        href="/settings/orgs/provisioning/runs"
        label="Runs"
        className="mb-4"
      />

      <Suspense fallback={<ProvisioningRunFallback />}>
        <ProvisioningRunData params={params} />
      </Suspense>
    </Page>
  )
}

async function ProvisioningRunData({ params }: Props) {
  const { runId } = await params
  const result = await workspace.provisioning.runs.retrieve(runId)
  if (result.error?.code === 'provisioning/run-not-found') notFound()
  if (result.error || !result.data)
    throw new Error(result.error?.message ?? 'Failed to load provisioning run.')
  const run = result.data
  const [appResult, organizationResult] = await Promise.all([
    $876.apps.admin.retrieve(run.app_id),
    $876.organizations.admin.retrieve({ id: run.organization_id }),
  ])
  const app = appResult.data
  const organization = organizationResult.data
  const appLabel = app?.name ?? run.app_id
  const appKey = app?.slug ?? run.app_id
  const initial = appLabel.trim().charAt(0).toUpperCase() || 'A'

  return (
    <>
      <div>
        <p className="876-eyebrow">Provisioning run</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="876-page-title">{run.id}</h1>
          <RunStatus status={run.status} />
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[0.8125rem]">
          <div className="flex items-center gap-1.5">
            <OrgAvatar
              name={organization?.name ?? run.organization_id}
              src={organization?.logo_url}
              size="sm"
            />
            {organization ? (
              <Link
                href={`/orgs/${organization.slug}`}
                className="text-foreground font-medium hover:underline"
              >
                {organization.name}
              </Link>
            ) : (
              <span>{run.organization_id}</span>
            )}
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
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
            {app ? (
              <Link
                href={`/apps/${app.slug}`}
                className="text-foreground font-medium hover:underline"
              >
                {app.name}
              </Link>
            ) : (
              <span>{run.app_id}</span>
            )}
          </div>
        </div>
      </div>

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Trigger" value={run.trigger.replaceAll('_', ' ')} />
        <Fact
          label="Manifest protocol"
          value={`Version ${run.manifest_version}`}
        />
        <Fact
          label="Finance revision"
          value={run.finance_revision?.toString() ?? 'Not applicable'}
        />
        <Fact
          label="Application revision"
          value={run.application_revision?.toString() ?? 'Not applicable'}
        />
        <Fact label="Attempts" value={run.attempt_count.toString()} />
        <Fact label="Created" value={formatDateTime(run.created_at)} />
        <Fact
          label="Started"
          value={
            run.started_at ? formatDateTime(run.started_at) : 'Not started'
          }
        />
        <Fact
          label="Completed"
          value={
            run.completed_at
              ? formatDateTime(run.completed_at)
              : 'Not completed'
          }
        />
      </section>

      {run.last_error ? (
        <section className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
          <p className="text-[0.8125rem] font-medium">Last error</p>
          <p className="text-muted-foreground mt-1 text-[0.8125rem] whitespace-pre-wrap">
            {run.last_error}
          </p>
        </section>
      ) : null}

      {run.status === 'failed' ? <RetryRunButton runId={run.id} /> : null}

      <section className="876-card overflow-hidden">
        <div className="border-b p-4">
          <p className="font-medium">Execution steps</p>
          <p className="text-muted-foreground mt-1 text-[0.8125rem]">
            Steps are immutable snapshots of the published recipes used by this
            run.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Revision</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {run.steps.map((step) => (
              <TableRow key={step.id}>
                <TableCell>{step.position + 1}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {step.target_type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-lg whitespace-normal">
                  <p className="font-medium">{step.step_key}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {step.description}
                  </p>
                  {step.last_error ? (
                    <p className="text-destructive mt-1 text-xs">
                      {step.last_error}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>{step.revision}</TableCell>
                <TableCell>
                  <RunStatus status={step.status} />
                </TableCell>
                <TableCell>{step.attempt_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  )
}

function ProvisioningRunFallback() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </section>
      <Skeleton className="h-72 w-full rounded-lg" />
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 text-[0.8125rem] font-medium capitalize">{value}</p>
    </div>
  )
}
