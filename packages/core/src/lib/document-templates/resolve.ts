import { layoutDefaults } from './layouts'
import {
  DOCUMENT_TEMPLATE_SECTION_KEYS,
  documentTemplateSettingsSchema,
  type DocumentTemplateLayoutKey,
  type DocumentTemplateSettings,
  type DocumentTemplateType,
} from './schema'

type Keyed = { key: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * A keyed list (detail fields, table columns) keeps the default order and
 * membership: a stored entry only restyles the default entry with the same
 * key, so a removed or unknown key can never add a column to a document.
 */
function mergeKeyedList(defaults: Keyed[], stored: unknown): Keyed[] {
  if (!Array.isArray(stored)) return defaults

  const storedByKey = new Map<string, Record<string, unknown>>()
  for (const entry of stored)
    if (isPlainObject(entry) && typeof entry.key === 'string')
      storedByKey.set(entry.key, entry)

  return defaults.map((entry) => {
    const override = storedByKey.get(entry.key)
    return override ? { ...entry, ...override, key: entry.key } : entry
  })
}

function mergeSection(
  defaults: Record<string, unknown>,
  stored: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults }

  for (const [field, defaultValue] of Object.entries(defaults)) {
    if (!(field in stored)) continue
    const storedValue = stored[field]

    if (Array.isArray(defaultValue))
      merged[field] = mergeKeyedList(defaultValue as Keyed[], storedValue)
    else if (isPlainObject(defaultValue) && isPlainObject(storedValue))
      merged[field] = { ...defaultValue, ...storedValue }
    else merged[field] = storedValue
  }

  return merged
}

/**
 * `layout default → stored overrides → resolved settings`.
 *
 * Stored overrides come from a database column and may be stale or malformed
 * after a schema change. Each section is validated on its own: a section that
 * no longer validates falls back to its layout default rather than failing
 * the whole document, so one bad field cannot stop an invoice from rendering.
 */
export function resolveDocumentTemplate(
  layoutKey: DocumentTemplateLayoutKey,
  documentType: DocumentTemplateType,
  overrides: unknown
): DocumentTemplateSettings {
  const defaults = layoutDefaults(layoutKey, documentType)
  if (!isPlainObject(overrides)) return defaults

  const shape = documentTemplateSettingsSchema.shape
  const resolved = { ...defaults } as Record<string, unknown>

  for (const section of DOCUMENT_TEMPLATE_SECTION_KEYS) {
    const stored = overrides[section]
    if (!isPlainObject(stored)) continue

    const candidate = mergeSection(
      defaults[section] as Record<string, unknown>,
      stored
    )
    const parsed = shape[section].safeParse(candidate)
    if (parsed.success) resolved[section] = parsed.data
  }

  return resolved as DocumentTemplateSettings
}
