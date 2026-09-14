import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

export const PACKAGE_CATEGORY_STATUS_VALUES = [
  'all',
  'active',
  'inactive',
] as const

export type PackageCategoryStatusFilter =
  (typeof PACKAGE_CATEGORY_STATUS_VALUES)[number]

export function resolvePackageCategoryStatusFilter(
  value: string | null | undefined
): PackageCategoryStatusFilter {
  return value === 'active' || value === 'inactive' ? value : 'all'
}

export const PACKAGE_CATEGORY_STATUS_OPTIONS: StatusFilterOption[] = [
  {
    value: 'all',
    label: 'All Package Categories',
    headingLabel: 'All package categories',
  },
  {
    value: 'active',
    label: 'Active',
    headingLabel: 'Active package categories',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    headingLabel: 'Inactive package categories',
  },
]

type Props = { orgSlug: string; status: PackageCategoryStatusFilter }

export function PackageCategoriesShell({ orgSlug, status }: Props) {
  return (
    <>
      <PageBreadcrumb
        href={`/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />
      <ResourceToolbar
        title="Package categories"
        titleFilter={
          <StatusFilterHeading
            label="Package categories"
            value={status}
            options={PACKAGE_CATEGORY_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/settings/customization/package-categories/new`}
        primaryVariant="info"
        refresh
      />
    </>
  )
}
