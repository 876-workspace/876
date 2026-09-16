import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TemplateDetailData } from '@/features/templates/components/template-detail-data'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Template' }

type Props = {
  params: Promise<{ templateId: string }>
  searchParams: Promise<{ start?: string }>
}

export default async function TemplateDetailPage({
  params,
  searchParams,
}: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { templateId } = await params
  const { start } = await searchParams

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/templates"
        label="Templates"
        className="mb-4"
      />
      <Suspense
        fallback={<div className="876-card h-96 animate-pulse" aria-hidden />}
      >
        <TemplateDetailData
          orgId={orgId}
          templateId={decodeURIComponent(templateId)}
          start={start}
        />
      </Suspense>
    </div>
  )
}
