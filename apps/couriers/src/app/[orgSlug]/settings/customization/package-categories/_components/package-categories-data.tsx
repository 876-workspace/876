import { AppError } from '@876/ui/app-error'
import type { PackageCategory } from '@876/couriers/admin'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAppError } from '@/lib/errors'
import { couriersOperator } from '@/lib/clients/couriers'

import { type PackageCategoryStatusFilter } from './package-categories-shell'
import { PackageCategoriesTable } from './package-categories-table'

const PAGE_LIMIT = 100

type Props = { orgSlug: string; status: PackageCategoryStatusFilter }

/**
 * Table body half of the package categories list. Rendered inside a Suspense
 * boundary so the breadcrumb and toolbar stay interactive while the rows
 * resolve. Every page is followed through `starting_after` so a tenant with
 * more than one page of categories still sees all of them.
 */
export async function PackageCategoriesData({ orgSlug, status }: Props) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s package categories.
        Please try again.
      </div>
    )

  const categories: PackageCategory[] = []
  let startingAfter: string | undefined
  for (;;) {
    const result = await couriersOperator.packageCategories.list(
      ctx.tenant.id,
      {
        limit: PAGE_LIMIT,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        ...(status === 'all' ? {} : { is_active: status === 'active' }),
      }
    )
    if (result.error)
      return (
        <div className="space-y-4">
          <AppError
            title="Package categories could not be loaded"
            error={getAppError(result.error.code)}
            variant="section"
          />
          <PackageCategoriesTable categories={[]} orgSlug={orgSlug} />
        </div>
      )

    categories.push(...result.data.data)
    if (!result.data.has_more) break
    const last = result.data.data[result.data.data.length - 1]
    if (!last) break
    startingAfter = last.id
  }

  return <PackageCategoriesTable categories={categories} orgSlug={orgSlug} />
}
