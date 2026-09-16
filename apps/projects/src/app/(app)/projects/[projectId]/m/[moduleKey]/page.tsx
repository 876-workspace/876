import { RecordList } from '@876/projects-ui/custom-modules/record-list'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { callerRoleKeys } from '@/lib/custom-modules/module-access'
import { loadModuleBundle } from '@/lib/custom-modules/record-pages'
import { toUiRecord } from '@/lib/custom-modules/record-form-helpers'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata = { title: 'Project records' }

type Props = {
  params: Promise<{ projectId: string; moduleKey: string }>
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function ProjectModuleRecordsPage({ params, searchParams }: Props) {
  const access = await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { projectId, moduleKey } = await params
  const filters = await searchParams

  const roleKeys = callerRoleKeys(access.permissions)
  const loaded = await loadModuleBundle(orgId, roleKeys, moduleKey)
  if (loaded.status === 'not-found') notFound()
  if (loaded.status === 'error') {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <AppError title="Records could not be loaded" error={loaded.error} variant="banner" />
      </div>
    )
  }

  const { bundle } = loaded
  const decodedProjectId = decodeURIComponent(projectId)
  const records = await serviceWithRoleKeys(roleKeys).customModules.listRecords(
    orgId,
    bundle.module.id,
    {
      projectId: decodedProjectId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { q: filters.q } : {}),
    }
  )

  const base = `/m/${encodeURIComponent(bundle.module.key)}`

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href={`/projects/${encodeURIComponent(decodedProjectId)}`} label="Project" className="mb-4" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">{bundle.module.pluralName}</h1>
        <div className="flex gap-2">
          <Link href={base} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            All records
          </Link>
          <Link href={`${base}/new`} className={buttonVariants({ variant: 'default', size: 'sm' })}>
            New {bundle.module.singularName}
          </Link>
        </div>
      </div>
      <form method="get" className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={filters.q ?? ''}
          placeholder="Search records"
          className="rounded-lg border px-3 py-1.5 text-sm"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ''}
          className="rounded-lg border px-3 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {bundle.statuses.map((status) => (
            <option key={status.key} value={status.key}>
              {status.label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Filter
        </button>
      </form>
      {records.error ? (
        <div className="mb-4">
          <AppError title="Records could not be loaded" error={records.error} variant="banner" />
        </div>
      ) : null}
      <RecordList
        records={(records.data?.data ?? []).map(toUiRecord)}
        statuses={bundle.statuses}
        columns={bundle.fields.map((field) => ({ fieldKey: field.key, label: field.label }))}
        hrefBase={base}
      />
    </div>
  )
}
