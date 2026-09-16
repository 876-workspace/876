import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { Suspense } from 'react'

import { ImportDetailData } from '@/features/projects/components/import-detail-data'
import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ jobId: string }>
}

export const metadata = { title: 'Import job' }

export default async function PlatformImportDetailPage({ params }: Props) {
  const { jobId } = await params

  return (
    <Page>
      <Suspense fallback={<ImportDetailFallback />}>
        <ImportDetailSection jobId={jobId} />
      </Suspense>
    </Page>
  )
}

async function ImportDetailSection({ jobId }: { jobId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return <ImportDetailData organizationId={organizationId} jobId={jobId} />
}

function ImportDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
