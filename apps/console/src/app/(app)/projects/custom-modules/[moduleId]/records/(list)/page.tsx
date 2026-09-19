import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { CustomModuleRecordsData } from '@/features/projects/components/custom-module-records-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../../_lib/base'

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
  if (!result.data) return { title: 'Records' }

  return { title: `${result.data.pluralName} • Records` }
}

export default async function PlatformCustomModuleRecordsPage({
  params,
}: Props) {
  const { moduleId } = await params

  return (
    <Page>
      <ResourceToolbar title="Records" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={CUSTOM_MODULE_RECORDS_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <CustomModuleRecordsSection moduleId={moduleId} />
      </Suspense>
    </Page>
  )
}

async function CustomModuleRecordsSection({ moduleId }: { moduleId: string }) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <CustomModuleRecordsData
      organizationId={organizationId}
      base={projectsBase(null)}
      moduleId={moduleId}
    />
  )
}
