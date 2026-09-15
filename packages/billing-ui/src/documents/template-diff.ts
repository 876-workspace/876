import {
  DOCUMENT_TEMPLATE_SECTION_KEYS,
  type DocumentTemplateOverrides,
  type DocumentTemplateSettings,
} from '@876/core/document-templates'

function valuesEqual(first: unknown, second: unknown): boolean {
  if (first === second) return true
  if (typeof first !== typeof second) return false
  if (typeof first !== 'object' || first === null || second === null)
    return false
  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second)) return false
    if (first.length !== second.length) return false
    return first.every((entry, index) => valuesEqual(entry, second[index]))
  }
  const firstRecord = first as Record<string, unknown>
  const secondRecord = second as Record<string, unknown>
  const firstKeys = Object.keys(firstRecord)
  if (firstKeys.length !== Object.keys(secondRecord).length) return false
  return firstKeys.every(
    (key) =>
      key in secondRecord && valuesEqual(firstRecord[key], secondRecord[key])
  )
}

/**
 * Computes the stored overrides for an edited template: section-level
 * partials containing only changed fields. Keyed lists (detail fields, table
 * columns) are included whole when any entry differs, matching the
 * replace-wholesale persistence the resolver merges by `key`.
 */
export function diffTemplateSettings(
  defaults: DocumentTemplateSettings,
  edited: DocumentTemplateSettings
): DocumentTemplateOverrides {
  const overrides: Record<string, unknown> = {}
  for (const section of DOCUMENT_TEMPLATE_SECTION_KEYS) {
    const before = defaults[section] as unknown as Record<string, unknown>
    const after = edited[section] as unknown as Record<string, unknown>
    if (valuesEqual(before, after)) continue
    const partial: Record<string, unknown> = {}
    for (const [field, afterValue] of Object.entries(after)) {
      if (!valuesEqual(before[field], afterValue)) partial[field] = afterValue
    }
    overrides[section] = partial
  }
  return overrides as DocumentTemplateOverrides
}
