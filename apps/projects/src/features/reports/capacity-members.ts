import type { CapacityMemberOption } from '@/types/reporting'

/** The member picker's options, ordered so the select reads alphabetically. */
export function toMemberOptions(
  labels: Readonly<Record<string, string>>
): CapacityMemberOption[] {
  return Object.entries(labels)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
