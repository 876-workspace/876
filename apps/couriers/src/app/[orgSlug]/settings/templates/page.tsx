import { Suspense } from 'react'
import { notFound } from 'next/navigation'

import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'

import {
  DocumentTypeTabs,
  resolveDocumentTypeParam,
} from './_components/document-type-tabs'
import { TemplatesGalleryData } from './_components/templates-gallery-data'

export const metadata = { title: 'Templates' }

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ type?: string | string[] }>
}

export default async function TemplatesSettingsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()

  const { type } = await searchParams
  const documentType = resolveDocumentTypeParam(type)
  const canManage = context.role === 'super-admin' || context.role === 'admin'

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Templates</PageTitle>
      </PageHeader>
      <DocumentTypeTabs orgSlug={orgSlug} active={documentType} />
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
            orgSlug={orgSlug}
            orgId={context.orgId}
            documentType={documentType}
            canManage={canManage}
          />
        </Suspense>
      </div>
    </Page>
  )
}
