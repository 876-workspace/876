import type { CapacityMemberOption } from './components/capacity-form'

/** The member picker's options, ordered so the select reads alphabetically. */
export function toMemberOptions(
  labels: Readonly<Record<string, string>>
): CapacityMemberOption[] {
  return Object.entries(labels)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
