import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { EditTemplateData } from '@/features/templates/components/edit-template-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Edit template' }

type Props = { params: Promise<{ templateId: string }> }

export default async function EditTemplatePage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()
  const { templateId } = await params

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`/settings/templates/${encodeURIComponent(templateId)}`}
        label="Template"
        className="mb-4"
      />
      <ResourceToolbar title="Edit template" />
      <Suspense
        fallback={<div className="876-card h-96 max-w-3xl animate-pulse" />}
      >
        <EditTemplateData
          orgId={orgId}
          templateId={decodeURIComponent(templateId)}
        />
      </Suspense>
    </div>
  )
}
