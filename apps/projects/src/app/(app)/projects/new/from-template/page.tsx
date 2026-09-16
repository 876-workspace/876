import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  FromTemplateData,
  type FromTemplateSearch,
} from '@/features/templates/components/from-template-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New project from template' }

type Props = { searchParams: Promise<FromTemplateSearch> }

export default async function NewProjectFromTemplatePage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const search = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ResourceToolbar title="New project from template" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <FromTemplateData orgId={orgId} search={search} />
      </Suspense>
    </div>
  )
}
