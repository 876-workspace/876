import { DOCUMENT_TITLES } from '@876/core/document-templates'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { resolveDocumentTypeParam } from '../_components/document-type-tabs'
import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'New Template' }

interface NewTemplatePageProps {
  searchParams: Promise<{ type?: string | string[] }>
}

export default async function NewTemplatePage({
  searchParams,
}: NewTemplatePageProps) {
  const context = await requirePagePermission('sales:write')
  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)
  const stored = await service.branding.retrieve(context.tenant.id)
  const branding = {
    accentColor: stored.accentColor,
    appearance: stored.appearance,
    sidebarTone: stored.sidebarTone,
  }

  return (
    <Page>
      <PageBreadcrumb
        href={`/settings/templates?type=${documentType}`}
        label="Templates"
        className="mb-4"
      />
      <h1 className="876-page-title">New template</h1>
      <div className="mt-6">
        <TemplateEditorForm
          mode="create"
          documentType={documentType}
          branding={branding}
          initial={{
            name: `${DOCUMENT_TITLES[documentType]} template`,
            layout: 'standard',
            settings: {},
          }}
          cancelHref={`/settings/templates?type=${documentType}`}
        />
      </div>
    </Page>
  )
}
