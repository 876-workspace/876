import Link from 'next/link'

import { RecordList } from '@876/projects-ui/custom-modules/record-list'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import {
  toUiCustomModuleRecord,
  toUiCustomModuleStatus,
} from '../custom-modules-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Custom module records list, shared by every host.
 * Read-only: the shared `RecordList` with status labels and the module's
 * field catalog as columns, links resolved against the host's Projects root.
 */
export async function CustomModuleRecordsData({
  organizationId,
  base,
  moduleId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  moduleId: string
}) {
  const decodedId = decodeURIComponent(moduleId)
  const moduleResult = await projects.customModules.retrieveModule(
    organizationId,
    decodedId
  )

  if (moduleResult.error?.code === 'projects/custom-module-not-found')
    notFound()

  if (moduleResult.error || !moduleResult.data) {
    return (
      <AppError
        title="Custom module could not be loaded"
        error={moduleResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const customModule = moduleResult.data
  const [recordsResult, statusesResult, fieldsResult] = await Promise.all([
    projects.customModules.listRecords(organizationId, customModule.id, {
      limit: 100,
    }),
    projects.customModules.listStatuses(organizationId, customModule.id),
    projects.customModules.listFields(organizationId, customModule.id),
  ])

  if (recordsResult.error || !recordsResult.data) {
    return (
      <AppError
        title="Custom module records could not be loaded"
        error={recordsResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const loadError = statusesResult.error ?? fieldsResult.error
  const fields = fieldsResult.data?.data ?? []
  const records = recordsResult.data.data.map(toUiCustomModuleRecord)
  const statuses = (statusesResult.data?.data ?? []).map(
    toUiCustomModuleStatus
  )
  const columns = fields
    .slice(0, 4)
    .map((field) => ({ fieldKey: field.key, label: field.label }))
  const recordsHrefBase = `${base}/custom-modules/${encodeURIComponent(customModule.id)}/records`

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some record details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <RecordList
        records={records}
        statuses={statuses}
        columns={columns}
        hrefBase={recordsHrefBase}
      />
      <Link
        href={`${base}/custom-modules/${encodeURIComponent(customModule.id)}`}
        className="text-muted-foreground inline-block text-sm hover:underline"
      >
        Back to {customModule.pluralName}
      </Link>
    </div>
  )
}
