import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
} from '@876/ui/detail-card'
import { MapPin, RectangleStackIcon } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { packageStatusLabel } from '../_lib/packages-list-config'
import { PackageActions } from './_components/package-actions'
import { resolvePackage, resolvePackageTitle } from './_lib/package-data'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, id } = await params
  const title = await resolvePackageTitle(orgSlug, id)
  return { title: title ? `${title} - Packages` : 'Package not found' }
}

export default async function PackageDetailLayout({ children, params }: Props) {
  const { orgSlug, id } = await params
  const closeHref = `/${orgSlug}/packages`

  return (
    <DetailCard aria-label="Package">
      <Suspense key={id} fallback={<PackageHeaderFallback closeHref={closeHref} />}>
        <PackageHeader orgSlug={orgSlug} id={id} closeHref={closeHref} />
      </Suspense>
      <DetailCardBody>{children}</DetailCardBody>
    </DetailCard>
  )
}

async function PackageHeader({
  orgSlug,
  id,
  closeHref,
}: {
  orgSlug: string
  id: string
  closeHref: string
}) {
  const resolved = await resolvePackage(orgSlug, id)
  if (!resolved) notFound()

  const { pkg, customerName, branch } = resolved
  const title = pkg.tracking_num ?? pkg.id
  const status = packageStatusLabel(pkg.status)
  const variant =
    pkg.status === 'COLLECTED' || pkg.status === 'ARRIVED'
      ? 'success'
      : pkg.status === 'READY_FOR_PICKUP'
        ? 'info'
        : pkg.status === 'UNCLAIMED'
          ? 'destructive'
          : 'secondary'

  return (
    <DetailCardHeader
      icon={
        <span className="bg-muted flex size-12 items-center justify-center rounded-xl">
          <RectangleStackIcon className="size-5" />
        </span>
      }
      title={title}
      meta={<Badge variant={variant}>{status}</Badge>}
      subtitle={
        <DetailCardMeta>
          <span>{customerName}</span>
          {pkg.category?.name ? <span>{pkg.category.name}</span> : null}
          {branch?.name ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {branch.name}
            </span>
          ) : null}
        </DetailCardMeta>
      }
      actions={<PackageActions orgSlug={orgSlug} id={id} />}
      closeHref={closeHref}
      closeLabel="Close package details"
    />
  )
}

function PackageHeaderFallback({ closeHref }: { closeHref: string }) {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-12 rounded-xl" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-64" />}
      actions={<Skeleton className="h-8 w-24" />}
      closeHref={closeHref}
      closeLabel="Close package details"
    />
  )
}
