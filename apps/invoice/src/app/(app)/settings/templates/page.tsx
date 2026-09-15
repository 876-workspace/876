import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'

import {
  DocumentTypeTabs,
  resolveDocumentTypeParam,
} from './_components/document-type-tabs'
import { TemplatesGalleryData } from './_components/templates-gallery-data'

export const metadata = { title: 'Templates' }

interface TemplatesPageProps {
  searchParams: Promise<{ type?: string | string[] }>
}

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps) {
  const access = await requireAppPermission('settings.view')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)
  const canManage = canAccess(access, 'settings.edit')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title">Templates</h1>
      <div className="mt-4">
        <DocumentTypeTabs active={documentType} />
      </div>
      <div className="mt-6">
        <Suspense
          fallback={
            <div
              aria-label="Loading templates"
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="border-border animate-pulse rounded-md border"
                >
                  <div className="bg-muted h-64" />
                  <div className="border-border border-t p-3">
                    <div className="bg-muted h-4 w-2/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <TemplatesGalleryData
            organizationId={context.orgId}
            documentType={documentType}
            canManage={canManage}
          />
        </Suspense>
      </div>
    </Page>
  )
}
