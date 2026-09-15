import { notFound } from 'next/navigation'

import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateType,
} from '@876/core/document-templates'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { BillingApiError } from '@/lib/service/api'

import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'Edit Template' }

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const context = await requirePagePermission('sales:write')
  const { templateId } = await params

  let template: {
    documentType: DocumentTemplateType
    name: string
    layout: DocumentTemplateLayoutKey
    settings: DocumentTemplateOverrides
  }
  try {
    const retrieved = await service.documentTemplates.retrieve(
      context.tenant.id,
      templateId
    )
    template = {
      documentType: retrieved.documentType,
      name: retrieved.name,
      layout: retrieved.layout,
      settings: retrieved.settings,
    }
  } catch (error) {
    if (
      error instanceof BillingApiError &&
      error.code === 'billing/document-template-not-found'
    )
      notFound()
    throw error
  }
  const stored = await service.branding.retrieve(context.tenant.id)
  const branding = {
    accentColor: stored.accentColor,
    appearance: stored.appearance,
    sidebarTone: stored.sidebarTone,
  }

  return (
    <Page>
      <PageBreadcrumb
        href={`/settings/templates?type=${template.documentType}`}
        label="Templates"
        className="mb-4"
      />
      <h1 className="876-page-title">Edit template</h1>
      <div className="mt-6">
        <TemplateEditorForm
          mode="update"
          templateId={templateId}
          documentType={template.documentType}
          branding={branding}
          initial={{
            name: template.name,
            layout: template.layout,
            settings: template.settings,
          }}
          cancelHref={`/settings/templates?type=${template.documentType}`}
        />
      </div>
    </Page>
  )
}
