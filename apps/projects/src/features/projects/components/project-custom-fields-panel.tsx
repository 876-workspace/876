import type {
  ProjectCustomField,
  ProjectCustomFieldValue,
} from '@876/projects/contracts'
import { DetailCardFact, DetailCardFacts, DetailCardSection } from '@876/ui/detail-card'

function formatValue(
  value: ProjectCustomFieldValue['value']
): string {
  if (value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
  return String(value)
}

export function ProjectCustomFieldsPanel({
  fields,
  values,
}: {
  fields: readonly ProjectCustomField[]
  values: readonly ProjectCustomFieldValue[]
}) {
  if (fields.length === 0) return null
  const byId = new Map(values.map((entry) => [entry.fieldId, entry]))

  return (
    <section className="876-card px-5 py-5 sm:px-6" aria-label="Project fields">
      <DetailCardSection title="Project fields">
        <DetailCardFacts className="sm:grid-cols-3">
          {fields.map((field) => (
            <DetailCardFact
              key={field.id}
              label={field.label}
              value={formatValue(byId.get(field.id)?.value ?? null)}
            />
          ))}
        </DetailCardFacts>
      </DetailCardSection>
    </section>
  )
}
