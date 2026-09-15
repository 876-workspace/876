import { Suspense } from 'react'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'

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
  const context = await requirePagePermission('sales:read')
  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)
  const canManage = context.permissions.includes('sales:write')

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
            tenantId={context.tenant.id}
            documentType={documentType}
            canManage={canManage}
          />
        </Suspense>
      </div>
    </Page>
  )
}
