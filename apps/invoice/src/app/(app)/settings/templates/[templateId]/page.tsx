import { notFound, redirect } from 'next/navigation'

import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateType,
} from '@876/core/document-templates'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/clients/billing'

import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'Edit Template' }

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  await requireAppPermission('settings.edit')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const { templateId } = await params
  const billing = await getBilling(context.orgId)
  const [retrieved, stored] = await Promise.all([
    billing.documentTemplates.retrieve(templateId),
    billing.branding.retrieve(),
  ])

  if (retrieved.error?.code === 'billing/document-template-not-found')
    notFound()

  let template: {
    documentType: DocumentTemplateType
    name: string
    layout: DocumentTemplateLayoutKey
    settings: DocumentTemplateOverrides
  } | null = null
  if (!retrieved.error && retrieved.data) {
    template = {
      documentType: retrieved.data.documentType,
      name: retrieved.data.name,
      layout: retrieved.data.layout,
      settings: retrieved.data.settings,
    }
  }

  const branding =
    !stored.error && stored.data
      ? {
          accentColor: stored.data.accentColor,
          appearance: stored.data.appearance,
          sidebarTone: stored.data.sidebarTone,
        }
      : null

  if (!template || !branding) {
    return (
      <Page>
        <PageBreadcrumb
          href="/settings/templates"
          label="Templates"
          className="mb-4"
        />
        <h1 className="876-page-title">Edit template</h1>
        <div className="mt-6">
          <AppError
            title="Template could not be loaded"
            error={
              retrieved.error ??
              stored.error ?? {
                code: 'templates/load-failed',
                message: 'Template could not be loaded. Try again.',
              }
            }
            variant="section"
          />
        </div>
      </Page>
    )
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
