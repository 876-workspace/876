import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { callerRoleKeys } from '@/lib/custom-modules/module-access'
import { loadModuleBundle } from '@/lib/custom-modules/record-pages'
import { moduleReportCsvHref } from '@/lib/custom-modules/record-form-helpers'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata = { title: 'Module report' }

type Props = { params: Promise<{ moduleKey: string }> }

export default async function ModuleReportPage({ params }: Props) {
  const access = await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { moduleKey } = await params

  const roleKeys = callerRoleKeys(access.permissions)
  const loaded = await loadModuleBundle(orgId, roleKeys, moduleKey)
  if (loaded.status === 'not-found') notFound()
  if (loaded.status === 'error') {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <AppError title="The report could not be loaded" error={loaded.error} variant="banner" />
      </div>
    )
  }

  const { bundle } = loaded
  const base = `/m/${encodeURIComponent(bundle.module.key)}`
  const service = serviceWithRoleKeys(roleKeys).customModules
  const [byStatus, created] = await Promise.all([
    service.statusReport(orgId, bundle.module.id, {}),
    service.createdReport(orgId, bundle.module.id, {}),
  ])

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href={base} label={bundle.module.pluralName} className="mb-4" />
      <h1 className="876-page-title mb-6">{bundle.module.pluralName} report</h1>
      <div className="space-y-6">
        <section className="876-card space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">By status</h2>
            <CsvExportLink
              href={moduleReportCsvHref(bundle.module.id, 'by-status')}
              download={`${bundle.module.key}-by-status.csv`}
            />
          </div>
          {byStatus.error ? (
            <AppError title="The status report could not be loaded" error={byStatus.error} variant="banner" />
          ) : (
            <ul className="space-y-2">
              {(byStatus.data?.byStatus ?? []).map((row) => (
                <li key={row.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="tabular-nums">{row.count}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{byStatus.data?.total ?? 0}</span>
              </li>
            </ul>
          )}
        </section>
        <section className="876-card space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Created</h2>
            <CsvExportLink
              href={moduleReportCsvHref(bundle.module.id, 'created')}
              download={`${bundle.module.key}-created.csv`}
            />
          </div>
          {created.error ? (
            <AppError title="The created report could not be loaded" error={created.error} variant="banner" />
          ) : (
            <ul className="space-y-2">
              {(created.data?.perDay ?? []).map((row) => (
                <li key={row.day} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{row.day}</span>
                  <span className="tabular-nums">{row.count}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{created.data?.total ?? 0}</span>
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
