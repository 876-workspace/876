import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'

import { PackageCategoryForm } from '../_components/package-category-form'

export const metadata = { title: 'Add package category' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewPackageCategoryPage({ params }: Props) {
  const { orgSlug } = await params
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

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/customization/package-categories`}
        label="Package categories"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Add package category</PageTitle>
      </PageHeader>
      <PackageCategoryForm orgSlug={orgSlug} />
    </Page>
  )
}
