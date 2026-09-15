import { notFound } from 'next/navigation'

import { DOCUMENT_TITLES } from '@876/core/document-templates'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'
import { createBillingIntegration } from '@/lib/services/billing'

import { resolveDocumentTypeParam } from '../_components/document-type-tabs'
import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = { title: 'New Template' }

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ type?: string | string[] }>
}

export default async function NewTemplateSettingsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()
  if (context.role !== 'super-admin' && context.role !== 'admin') notFound()

  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)

  const billing = createBillingIntegration()
  const stored = await billing.branding.retrieve(context.orgId)
  if (stored.error || !stored.data) {
    return (
      <Page>
        <PageHeader className="mb-4">
          <PageTitle>New template</PageTitle>
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
        <PageTitle>New template</PageTitle>
      </PageHeader>
      <div className="mt-6">
        <TemplateEditorForm
          mode="create"
          orgSlug={orgSlug}
          documentType={documentType}
          branding={branding}
          initial={{
            name: `${DOCUMENT_TITLES[documentType]} template`,
            layout: 'standard',
            settings: {},
          }}
          cancelHref={`/${orgSlug}/settings/templates?type=${documentType}`}
        />
      </div>
    </Page>
  )
}
