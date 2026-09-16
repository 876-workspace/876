import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CustomModuleDetailData } from '@/features/projects/components/custom-module-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ moduleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { moduleId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.customModules.retrieveModule(
    organizationId,
    decodeURIComponent(moduleId)
  )
  if (!result.data) return { title: 'Custom module' }

  return { title: `${result.data.pluralName} • Custom modules` }
}

export default async function PlatformCustomModuleDetailPage({
  params,
}: Props) {
  const { moduleId } = await params

  return (
    <Page>
      <Suspense fallback={<CustomModuleDetailFallback />}>
        <CustomModuleDetailSection moduleId={moduleId} />
      </Suspense>
    </Page>
  )
}

async function CustomModuleDetailSection({ moduleId }: { moduleId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <CustomModuleDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      moduleId={moduleId}
    />
  )
}

function CustomModuleDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
