import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { FinanceData } from '@/features/finance/components/finance-data'
import { resolvePeriod } from '@/lib/period'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { ProjectTabs } from '../_components/project-tabs'

export const metadata: Metadata = { title: 'Finance' }

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function ProjectFinancePage({
  params,
  searchParams,
}: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  await requireProjectsContext()
  const { projectId } = await params
  const period = resolvePeriod(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectTabs projectId={projectId} />
      <ResourceToolbar title="Finance" refresh />
      <Suspense fallback={<Skeleton className="mt-4 h-80 w-full" />}>
        <FinanceData projectId={projectId} period={period} />
      </Suspense>
    </div>
  )
}
