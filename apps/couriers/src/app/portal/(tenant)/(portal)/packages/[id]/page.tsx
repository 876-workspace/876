import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { ChevronLeft } from '@876/ui/icons'

import { PackageStatusBadge } from '@/components/portal/package-status-badge'
import { PackageTimeline } from '@/components/portal/package-timeline'
import { requirePortalCustomer } from '@/lib/portal/customer'
import { service } from '@/lib/service'

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
})

export default async function PortalPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const returnTo = `/portal/packages/${id}`
  const { tenant, profile } = await requirePortalCustomer(returnTo)
  const packageItem = await service.packages.retrieve({
    tenantId: tenant.id,
    id,
  })
  if (!packageItem || packageItem.customerId !== profile.id) notFound()

  const title =
    packageItem.description || packageItem.trackingNum || 'Package details'

  return (
    <div className="space-y-6">
      <Link
        href="/portal/packages"
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <ChevronLeft className="size-4" />
        Packages
      </Link>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <PackageStatusBadge status={packageItem.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>Package details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Tracking number">
                {packageItem.trackingNum || 'Not available'}
              </Detail>
              {packageItem.carrier ? (
                <Detail label="Carrier">{packageItem.carrier.name}</Detail>
              ) : null}
              {packageItem.branch ? (
                <Detail label="Branch">{packageItem.branch.name}</Detail>
              ) : null}
              {packageItem.mailbox ? (
                <Detail label="Mailbox">{packageItem.mailbox.number}</Detail>
              ) : null}
              {packageItem.description ? (
                <Detail label="Description">{packageItem.description}</Detail>
              ) : null}
              <Detail label="Package type">
                {formatEnum(packageItem.packageType)}
              </Detail>
              {packageItem.actualWeight !== null ? (
                <Detail label="Actual weight">
                  {formatWeight(packageItem.actualWeight)}
                </Detail>
              ) : null}
              {packageItem.chargeableWeight !== null ? (
                <Detail label="Chargeable weight">
                  {formatWeight(packageItem.chargeableWeight)}
                </Detail>
              ) : null}
              <Detail label="Added">
                {formatDateTime(packageItem.createdAt)}
              </Detail>
              {packageItem.collectedAt !== null ? (
                <Detail label="Collected">
                  {formatDateTime(packageItem.collectedAt)}
                </Detail>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking progress</CardTitle>
          </CardHeader>
          <CardContent>
            <PackageTimeline status={packageItem.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 font-medium break-words">{children}</dd>
    </div>
  )
}

function formatDateTime(timestamp: number): string {
  return DATE_TIME_FORMATTER.format(new Date(timestamp * 1000))
}

function formatWeight(weight: number): string {
  return `${weight.toLocaleString('en-US', { maximumFractionDigits: 2 })} lb`
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
