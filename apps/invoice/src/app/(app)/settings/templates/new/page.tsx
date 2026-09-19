import { redirect } from 'next/navigation'

import { DOCUMENT_TITLES } from '@876/core/document-templates'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/clients/billing'

import { resolveDocumentTypeParam } from '../_components/document-type-tabs'
import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'New Template' }

interface NewTemplatePageProps {
  searchParams: Promise<{ type?: string | string[] }>
}

export default async function NewTemplatePage({
  searchParams,
}: NewTemplatePageProps) {
  await requireAppPermission('settings.edit')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)
  const billing = await getBilling(context.orgId)
  const stored = await billing.branding.retrieve()
  if (stored.error || !stored.data) {
    return (
      <Page>
        <PageBreadcrumb
          href={`/settings/templates?type=${documentType}`}
          label="Templates"
          className="mb-4"
        />
        <h1 className="876-page-title">New template</h1>
        <div className="mt-6">
          <AppError
            title="Branding could not be loaded"
            error={
              stored.error ?? {
                code: 'branding/load-failed',
                message: 'Branding could not be loaded. Try again.',
              }
            }
            variant="section"
          />
        </div>
      </Page>
    )
  }
  const branding = {
    accentColor: stored.data.accentColor,
    appearance: stored.data.appearance,
    sidebarTone: stored.data.sidebarTone,
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
