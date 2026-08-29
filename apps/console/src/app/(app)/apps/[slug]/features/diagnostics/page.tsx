import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Skeleton } from '@876/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ organizationId?: string; userId?: string }>
}

export default async function FeatureDiagnosticsPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, { organizationId, userId }] = await Promise.all([
    params,
    searchParams,
  ])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="876-page-title">Feature & entitlement diagnostics</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Explain global, parent, subscription-module, organization, and user
          decisions. Product permissions remain a separate final access check.
        </p>
      </div>

      <form className="876-card grid gap-4 p-5 md:grid-cols-2" method="get">
        <div>
          <label className="text-sm font-medium" htmlFor="organizationId">
            Organization ID
          </label>
          <Input
            id="organizationId"
            name="organizationId"
            defaultValue={organizationId}
            placeholder="org_…"
            className="mt-2"
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            Required when evaluating a product app subscription.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="userId">
            User ID (optional)
          </label>
          <Input
            id="userId"
            name="userId"
            defaultValue={userId}
            placeholder="user_…"
            className="mt-2"
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Evaluate access</Button>
        </div>
      </form>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
        <FeatureDiagnosticsResult
          slug={slug}
          organizationId={organizationId}
          userId={userId}
        />
      </Suspense>
    </div>
  )
}

async function FeatureDiagnosticsResult({
  slug,
  organizationId,
  userId,
}: {
  slug: string
  organizationId?: string
  userId?: string
}) {
  const app = await resolveApp(slug)
  if (!app) notFound()

  const requiresOrganization = app.app_kind === 'product'
  if (requiresOrganization && !organizationId) {
    if (!userId) return null
    return (
      <p className="text-muted-foreground text-sm">
        Enter an organization ID to evaluate this product app.
      </p>
    )
  }
  if (!organizationId && !userId) return null

  const result = await $876.features.admin.evaluateDetails({
    appId: app.id,
    organizationId: organizationId || undefined,
    userId: userId || undefined,
  })
  if (result.error) throw new Error(result.error.message)

  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Global</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Org override</TableHead>
            <TableHead>User override</TableHead>
            <TableHead>Effective</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.data.map((decision) => (
            <TableRow key={decision.feature.id}>
              <TableCell>
                <p className="font-medium">{decision.feature.name}</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {decision.feature.slug}
                </p>
                <p className="text-muted-foreground text-xs">
                  Rollout source:{' '}
                  {decision.rollout_source === 'posthog' ? 'PostHog' : 'Local'}
                </p>
              </TableCell>
              <DecisionCell value={decision.global_enabled} />
              <DecisionCell value={decision.parent_enabled} />
              <TableCell>
                {decision.module_gated ? (
                  <Badge
                    variant={
                      decision.module_entitled ? 'success' : 'destructive'
                    }
                  >
                    {decision.module_entitled ? 'Entitled' : 'Not entitled'}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Not gated
                  </span>
                )}
              </TableCell>
              <OverrideCell value={decision.organization_override} />
              <OverrideCell value={decision.user_override} />
              <DecisionCell value={decision.enabled} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DecisionCell({ value }: { value: boolean }) {
  return (
    <TableCell>
      <Badge variant={value ? 'success' : 'secondary'}>
        {value ? 'On' : 'Off'}
      </Badge>
    </TableCell>
  )
}

function OverrideCell({ value }: { value: boolean | null }) {
  return (
    <TableCell>
      {value === null ? (
        <span className="text-muted-foreground text-xs">Default</span>
      ) : (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Force on' : 'Force off'}
        </Badge>
      )}
    </TableCell>
  )
}
