import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAppError } from '@/lib/errors'
import { couriersOperator } from '@/lib/services/couriers'

import { PackageCategoryForm } from '../../_components/package-category-form'

export const metadata = { title: 'Edit package category' }

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function EditPackageCategoryPage({ params }: Props) {
  const { orgSlug, id } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return (
      <Page>
        <PageBreadcrumb
          href={`/${orgSlug}/settings/customization/package-categories`}
          label="Package categories"
          className="mb-4"
        />
        <div className="876-empty-dashed max-w-2xl">
          You do not have permission to manage package categories.
        </div>
      </Page>
    )

  const result = await couriersOperator.packageCategories.retrieve(
    ctx.tenant.id,
    id
  )
  if (result.error) {
    if (result.error.code === 'package-category/not-found') notFound()
    return (
      <Page>
        <PageBreadcrumb
          href={`/${orgSlug}/settings/customization/package-categories`}
          label="Package categories"
          className="mb-4"
        />
        <PageHeader className="mb-8">
          <PageTitle>Edit package category</PageTitle>
        </PageHeader>
        <AppError
          title="Package category could not be loaded"
          error={getAppError(result.error.code)}
          variant="section"
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/customization/package-categories`}
        label="Package categories"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit package category</PageTitle>
      </PageHeader>
      <PackageCategoryForm orgSlug={orgSlug} category={result.data} />
    </Page>
  )
}
