import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { CustomModuleRecordsData } from '@/features/projects/components/custom-module-records-data'
import { CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { projects } from '@/lib/services/projects'

type Props = {
  params: Promise<{ orgSlug: string; moduleId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, moduleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Records' }

  const result = await projects.customModules.retrieveModule(
    org.id,
    decodeURIComponent(moduleId)
  )
  if (!result.data) return { title: 'Records' }

  return {
    title: `${result.data.pluralName} • Records - Organizations`,
  }
}

export default async function OrganizationCustomModuleRecordsPage({
  params,
}: Props) {
  const { orgSlug, moduleId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Records" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <CustomModuleRecordsData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          moduleId={moduleId}
        />
      </Suspense>
    </div>
  )
}
