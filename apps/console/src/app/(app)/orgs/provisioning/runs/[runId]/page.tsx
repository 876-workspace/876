import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'
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
import { ProvisioningNav } from '../../provisioning-nav'
import { RetryRunButton } from '../run-actions'
import { RunStatus } from '../run-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = { params: Promise<{ runId: string }> }

export default async function ProvisioningRunPage({ params }: Props) {
  const { runId } = await params
  const result = await $876.provisioning.runs.retrieve(runId)
  if (result.error?.code === 'provisioning/run-not-found') notFound()
  if (result.error || !result.data)
    throw new Error(result.error?.message ?? 'Failed to load provisioning run.')
  const run = result.data
  const [appResult, organizationResult] = await Promise.all([
    $876.apps.retrieve(run.app_id),
    $876.orgs.retrieve(run.organization_id),
  ])
  const app = appResult.data
  const organization = organizationResult.data

  return (
    <Page className="space-y-6">
      <PageBreadcrumb
        href="/orgs/provisioning/runs"
        label="Runs"
        className="mb-4"
      />
      <div>
        <p className="876-eyebrow">Provisioning run</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="876-page-title">{run.id}</h1>
          <RunStatus status={run.status} />
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {organization?.name ?? run.organization_id} ·{' '}
          {app?.name ?? run.app_id}
        </p>
      </div>
      <ProvisioningNav current="runs" />

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
          <p className="text-sm font-medium">Last error</p>
          <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
            {run.last_error}
          </p>
        </section>
      ) : null}

      {run.status === 'failed' ? <RetryRunButton runId={run.id} /> : null}

      <section className="876-card overflow-hidden">
        <div className="border-b p-4">
          <p className="font-medium">Execution steps</p>
          <p className="text-muted-foreground mt-1 text-sm">
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
    </Page>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium capitalize">{value}</p>
    </div>
  )
}
