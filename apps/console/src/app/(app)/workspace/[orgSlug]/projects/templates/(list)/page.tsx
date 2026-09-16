import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { projectsBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '@/features/orgs/org-data'
import { TemplatesData } from '@/features/projects/components/templates-data'
import { TEMPLATES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Templates' }

  return { title: `${org.name ?? org.slug} • Templates - Organizations` }
}

export default async function OrganizationTemplatesPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <div>
      <ResourceToolbar title="Templates" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TEMPLATES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <TemplatesData organizationId={org.id} base={projectsBase(orgSlug)} />
      </Suspense>
    </div>
  )
}
