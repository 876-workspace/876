import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { callerRoleKeys } from '@/lib/custom-modules/module-access'
import { loadModuleBundle } from '@/lib/custom-modules/record-pages'
import { serviceWithRoleKeys } from '@/lib/custom-modules/service-with-roles'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

import { RecordEditForm } from './_components/record-edit-form'

export const metadata = { title: 'Edit record' }

type Props = { params: Promise<{ moduleKey: string; recordId: string }> }

export default async function EditRecordPage({ params }: Props) {
  const access = await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
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
  const record = await serviceWithRoleKeys(roleKeys).customModules.retrieveRecord(
    orgId,
    bundle.module.id,
    decodeURIComponent(recordId)
  )
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

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href={`${base}/${encodeURIComponent(record.data.id)}`}
        label={record.data.title}
        className="mb-4"
      />
      <h1 className="876-page-title mb-6">Edit record</h1>
      <RecordEditForm
        moduleId={bundle.module.id}
        moduleKey={bundle.module.key}
        record={record.data}
        fields={bundle.fields}
        statuses={bundle.statuses}
        layout={bundle.layout}
        cancelHref={`${base}/${encodeURIComponent(record.data.id)}`}
      />
    </div>
  )
}
