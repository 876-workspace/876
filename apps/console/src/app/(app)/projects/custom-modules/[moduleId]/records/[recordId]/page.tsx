import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CustomModuleRecordDetailData } from '@/features/projects/components/custom-module-record-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../../../_lib/base'

type Props = {
  params: Promise<{ moduleId: string; recordId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleId, recordId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const moduleResult = await projects.customModules.retrieveModule(
    organizationId,
    decodeURIComponent(moduleId)
  )
  if (!moduleResult.data) return { title: 'Record' }

  const recordResult = await projects.customModules.retrieveRecord(
    organizationId,
    moduleResult.data.id,
    decodeURIComponent(recordId)
  )
  if (!recordResult.data) return { title: 'Record' }

  return { title: `${recordResult.data.title} • Records` }
}

export default async function PlatformCustomModuleRecordDetailPage({
  params,
}: Props) {
  const { moduleId, recordId } = await params

  return (
    <Page>
      <Suspense fallback={<CustomModuleRecordFallback />}>
        <CustomModuleRecordSection moduleId={moduleId} recordId={recordId} />
      </Suspense>
    </Page>
  )
}

async function CustomModuleRecordSection({
  moduleId,
  recordId,
}: {
  moduleId: string
  recordId: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <CustomModuleRecordDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      moduleId={moduleId}
      recordId={recordId}
    />
  )
}

function CustomModuleRecordFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
