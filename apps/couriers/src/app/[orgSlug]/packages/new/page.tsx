import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'
import { PackageForm } from '../_components/package-form'
import { loadPackageFormOptions } from '../_lib/package-form-data'

export const metadata = { title: 'Add package' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewPackagePage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <DetailCard aria-label="Add package">
      <DetailCardHeader
        title="Add package"
        closeHref={`/${orgSlug}/packages`}
        closeLabel="Close add package"
      />
      <DetailCardBody>
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <NewPackageData orgSlug={orgSlug} />
        </Suspense>
      </DetailCardBody>
    </DetailCard>
  )
}

async function NewPackageData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  const options = await loadPackageFormOptions(orgSlug)
  return <PackageForm orgSlug={orgSlug} {...options} />
}
