import { RecordSummary } from '@876/projects-ui/custom-modules/record-summary'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { callerRoleKeys } from '@/lib/custom-modules/module-access'
import { loadModuleBundle } from '@/lib/custom-modules/record-pages'
import { moduleReportCsvHref, toUiRecord } from '@/lib/custom-modules/record-form-helpers'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata = { title: 'Record' }

type Props = { params: Promise<{ moduleKey: string; recordId: string }> }

export default async function RecordDetailPage({ params }: Props) {
  const access = await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const { moduleKey, recordId } = await params

  const roleKeys = callerRoleKeys(access.permissions)
  const loaded = await loadModuleBundle(orgId, roleKeys, moduleKey)
  if (loaded.status === 'not-found') notFound()
  if (loaded.status === 'error') {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <AppError title="The record could not be loaded" error={loaded.error} variant="banner" />
      </div>
    )
  }

  const { bundle } = loaded
  const service = serviceWithRoleKeys(roleKeys).customModules
  const [record, links] = await Promise.all([
    service.retrieveRecord(orgId, bundle.module.id, decodeURIComponent(recordId)),
    service.listLinks(orgId, bundle.module.id, decodeURIComponent(recordId)),
  ])

  if (record.error?.code === 'projects/custom-record-not-found') notFound()
  if (record.error || !record.data) {
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <AppError
          title="The record could not be loaded"
          error={
            record.error ?? {
              code: 'projects/custom-record-unavailable',
              message: 'The record could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )
  }

  const base = `/m/${encodeURIComponent(bundle.module.key)}`
  const uiRecord = toUiRecord(record.data)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href={base} label={bundle.module.pluralName} className="mb-4" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title">{record.data.title}</h1>
        <Link
          href={`${base}/${encodeURIComponent(record.data.id)}/edit`}
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          Edit
        </Link>
      </div>
      <div className="space-y-6">
        <RecordSummary
          record={uiRecord}
          statuses={bundle.statuses}
          fields={bundle.fields.map((field) => ({
            fieldKey: field.key,
            label: field.label,
          }))}
        />
        <section className="876-card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Links</h2>
          {links.error ? (
            <AppError title="Links could not be loaded" error={links.error} variant="banner" />
          ) : (links.data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No links yet. Link this record to work items, projects, or other records.
            </p>
          ) : (
            <ul className="divide-y">
              {(links.data?.data ?? []).map((link) => (
                <li key={link.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="font-medium">{link.relation}</span>
                  <span className="text-muted-foreground text-xs">
                    {link.targetType} · {link.targetId}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <CsvExportLink href={moduleReportCsvHref(bundle.module.id, 'by-status')} download={`${bundle.module.key}-by-status.csv`} />
      </div>
    </div>
  )
}
