import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CustomModuleRecordDetailData } from '@/features/projects/components/custom-module-record-detail-data'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; moduleId: string; recordId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, moduleId, recordId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Record' }

  const moduleResult = await projects.customModules.retrieveModule(
    org.id,
    decodeURIComponent(moduleId)
  )
  if (!moduleResult.data) return { title: 'Record' }

  const recordResult = await projects.customModules.retrieveRecord(
    org.id,
    moduleResult.data.id,
    decodeURIComponent(recordId)
  )
  if (!recordResult.data) return { title: 'Record' }

  return { title: `${recordResult.data.title} • Records - Organizations` }
}

export default async function OrganizationCustomModuleRecordDetailPage({
  params,
}: Props) {
  const { orgSlug, moduleId, recordId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<CustomModuleRecordFallback />}>
      <CustomModuleRecordDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        moduleId={moduleId}
        recordId={recordId}
      />
    </Suspense>
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
