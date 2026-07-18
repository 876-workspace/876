import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { FinanceProvisioningEditor } from '@/app/(app)/orgs/provisioning/finance-provisioning-editor'

type Props = { params: Promise<{ slug: string }> }

export default async function AppProvisioningPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const [manifestResult, catalogResult] = await Promise.all([
    $876.provisioning.retrieve('application', app.id),
    $876.provisioning.retrieveCatalog('application', app.id),
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
        <p className="text-muted-foreground max-w-2xl text-sm">
          This page owns only {app.name}-specific defaults. Organization-wide
          currencies, taxes, and payment data remain centralized in shared
          finance provisioning.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orgs/provisioning/runs?app_id=${encodeURIComponent(app.id)}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            View runs
          </Link>
          <Link
            href="/orgs/provisioning"
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
