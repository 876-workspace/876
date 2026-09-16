import Link from 'next/link'

import { RecordSummary } from '@876/projects-ui/custom-modules/record-summary'
import { AppError } from '@876/ui/app-error'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { notFound } from 'next/navigation'

import {
  toUiCustomModuleRecord,
  toUiCustomModuleStatus,
} from '../custom-modules-mappers'
import { projects } from '@/lib/services/projects'

import { formatOperatorDateOrDash } from './operator-format'

/**
 * The data half of the Custom module record detail, shared by every host.
 * Read-only: the shared `RecordSummary` with the module's field catalog as
 * labels, plus record provenance. No edit, transition, or delete
 * affordances.
 */
export async function CustomModuleRecordDetailData({
  organizationId,
  base,
  moduleId,
  recordId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  moduleId: string
  recordId: string
}) {
  const decodedModuleId = decodeURIComponent(moduleId)
  const decodedRecordId = decodeURIComponent(recordId)
  const moduleResult = await projects.customModules.retrieveModule(
    organizationId,
    decodedModuleId
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
  const recordResult = await projects.customModules.retrieveRecord(
    organizationId,
    customModule.id,
    decodedRecordId
  )

  if (recordResult.error?.code === 'projects/custom-module-record-not-found')
    notFound()

  if (recordResult.error || !recordResult.data) {
    return (
      <AppError
        title="Custom module record could not be loaded"
        error={recordResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const [statusesResult, fieldsResult] = await Promise.all([
    projects.customModules.listStatuses(organizationId, customModule.id),
    projects.customModules.listFields(organizationId, customModule.id),
  ])

  const loadError = statusesResult.error ?? fieldsResult.error
  const fields = fieldsResult.data?.data ?? []
  const record = toUiCustomModuleRecord(recordResult.data)
  const statuses = (statusesResult.data?.data ?? []).map(
    toUiCustomModuleStatus
  )
  const recordsHref = `${base}/custom-modules/${encodeURIComponent(customModule.id)}/records`

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some record details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <RecordSummary
        record={record}
        statuses={statuses}
        fields={fields.map((field) => ({
          fieldKey: field.key,
          label: field.label,
        }))}
      />
      <section className="876-card p-5 sm:p-6">
        <DetailCardSection title="Details">
          <DetailCardFacts>
            <DetailCardFact label="Module" value={customModule.pluralName} />
            <DetailCardFact
              label="Project"
              value={record.projectId ?? 'Organization'}
            />
            <DetailCardFact
              label="Created"
              value={formatOperatorDateOrDash(record.createdAt)}
            />
            <DetailCardFact
              label="Updated"
              value={formatOperatorDateOrDash(record.updatedAt)}
            />
          </DetailCardFacts>
        </DetailCardSection>
      </section>
      <div className="flex flex-wrap gap-4">
        <Link
          href={recordsHref}
          className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Back to records
        </Link>
        <Link
          href={`${base}/custom-modules/${encodeURIComponent(customModule.id)}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          Back to {customModule.pluralName}
        </Link>
      </div>
    </div>
  )
}
