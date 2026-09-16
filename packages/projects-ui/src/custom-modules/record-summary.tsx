import { RecordStatusBadge } from './record-status-badge'
import { formatRecordValue } from './record-list'
import type { CustomModuleRecord, CustomModuleStatus } from './types'

export type RecordSummaryField = {
  fieldKey: string
  label: string
}

export type RecordSummaryProps = {
  record: CustomModuleRecord
  statuses?: readonly CustomModuleStatus[]
  fields?: readonly RecordSummaryField[]
}

export function RecordSummary({
  record,
  statuses,
  fields = [],
}: RecordSummaryProps) {
  return (
    <div data-slot="record-summary" className="876-card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{record.title}</h3>
        <RecordStatusBadge statusKey={record.statusKey} statuses={statuses} />
      </div>
      {fields.length === 0 ? null : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.fieldKey}>
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm">
                {formatRecordValue(record.values[field.fieldKey])}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
