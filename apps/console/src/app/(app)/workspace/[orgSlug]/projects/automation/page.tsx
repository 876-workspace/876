import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { AutomationData } from '@/features/projects/components/automation-data'
import { AUTOMATION_RULES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Automation' }

  return { title: `${org.name ?? org.slug} • Automation - Organizations` }
}

export default async function OrganizationAutomationPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Automation" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={AUTOMATION_RULES_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <AutomationData organizationId={org.id} base={projectsBase(orgSlug)} />
      </Suspense>
    </div>
  )
}
