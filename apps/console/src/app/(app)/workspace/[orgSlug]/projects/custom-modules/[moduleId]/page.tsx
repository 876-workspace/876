import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CustomModuleDetailData } from '@/features/projects/components/custom-module-detail-data'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; moduleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, moduleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Custom module' }

  const result = await projects.customModules.retrieveModule(
    org.id,
    decodeURIComponent(moduleId)
  )
  if (!result.data) return { title: 'Custom module' }

  return {
    title: `${result.data.pluralName} • Custom modules - Organizations`,
  }
}

export default async function OrganizationCustomModuleDetailPage({
  params,
}: Props) {
  const { orgSlug, moduleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<CustomModuleDetailFallback />}>
      <CustomModuleDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        moduleId={moduleId}
      />
    </Suspense>
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
