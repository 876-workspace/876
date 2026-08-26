import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { Skeleton } from '@876/ui/skeleton'

import { workspace } from '@/lib/876'
import { resolveApp } from '../_data'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'

type Props = { params: Promise<{ slug: string }> }

export default function AppProvisioningPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <AppProvisioningData params={params} />
    </Suspense>
  )
}

async function AppProvisioningData({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const [manifestResult, catalogResult] = await Promise.all([
    workspace.provisioning.draft.retrieve('application', app.id),
    workspace.provisioning.catalog.retrieve('application', app.id),
  ])
  if (
    manifestResult.error &&
    manifestResult.error.code !== 'provisioning/manifest-not-found'
  )
    throw new Error(manifestResult.error.message)
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load provisioning catalog.'
    )

  return (
    <div className="space-y-5">
      <section className="876-card flex flex-wrap items-center justify-between gap-4 p-4">
        <p className="text-muted-foreground max-w-2xl text-[0.8125rem]">
          This page owns only {app.name}-specific defaults. Organization-wide
          currencies, taxes, and payment data remain centralized in shared
          finance provisioning.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/settings/orgs/provisioning/runs?app_id=${encodeURIComponent(app.id)}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            View runs
          </Link>
          <Link
            href="/settings/orgs/provisioning"
            className={buttonVariants({ variant: 'outline' })}
          >
            Shared finance defaults
          </Link>
        </div>
      </section>
      <FinanceProvisioningEditor
        catalog={catalogResult.data}
        manifest={manifestResult.data ?? null}
        target={{ type: 'application', key: app.id }}
        heading={`${app.name} application defaults`}
        description={`Typed defaults created when a new organization activates ${app.name}. Empty catalogs are valid until the application declares a provisionable resource.`}
      />
    </div>
  )
}
