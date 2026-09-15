import { notFound } from 'next/navigation'

import type {
  DocumentTemplateLayoutKey,
  DocumentTemplateOverrides,
  DocumentTemplateType,
} from '@876/core/document-templates'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'
import { createBillingIntegration } from '@/lib/services/billing'

import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'Edit Template' }

type Props = {
  params: Promise<{ orgSlug: string; templateId: string }>
}

export default async function EditTemplateSettingsPage({ params }: Props) {
  const { orgSlug, templateId } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()
  if (context.role !== 'super-admin' && context.role !== 'admin') notFound()

  const billing = createBillingIntegration()
  const retrieved = await billing.documentTemplates.retrieve(
    context.orgId,
    templateId
  )
  if (retrieved.error?.code === 'billing/document-template-not-found')
    notFound()
  if (retrieved.error || !retrieved.data)
    throw new Error(
      retrieved.error?.code ?? 'finance/document-template-unavailable'
    )

  const template: {
    documentType: DocumentTemplateType
    name: string
    layout: DocumentTemplateLayoutKey
    settings: DocumentTemplateOverrides
  } = {
    documentType: retrieved.data.documentType,
    name: retrieved.data.name,
    layout: retrieved.data.layout,
    settings: retrieved.data.settings,
  }

  const stored = await billing.branding.retrieve(context.orgId)
  if (stored.error || !stored.data) {
    return (
      <Page>
        <PageHeader className="mb-4">
          <PageTitle>Edit template</PageTitle>
        </PageHeader>
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load your branding settings. Please try again.
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
      <PageHeader className="mb-4">
        <PageTitle>Edit template</PageTitle>
      </PageHeader>
      <div className="mt-6">
        <TemplateEditorForm
          mode="update"
          orgSlug={orgSlug}
          templateId={templateId}
          documentType={template.documentType}
          branding={branding}
          initial={{
            name: template.name,
            layout: template.layout,
            settings: template.settings,
          }}
          cancelHref={`/${orgSlug}/settings/templates?type=${template.documentType}`}
        />
      </div>
    </Page>
  )
}
