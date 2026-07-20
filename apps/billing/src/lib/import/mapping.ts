import {
  IMPORTABLE_FIELDS,
  type CustomerImportRawRow,
  type ImportableFieldKey,
} from '@/types/customer-import'

/** A file header → target customer field (empty string = don't import). */
export type ColumnMapping = Record<string, ImportableFieldKey | ''>

/**
 * Auto-matches each file header to a customer field by header spelling
 * (alias, field key, or label — case-insensitive). Each field is claimed at
 * most once; the first header that matches wins.
 */
export function autoMapHeaders(headers: string[]): ColumnMapping {
  const claimed = new Set<ImportableFieldKey>()
  const mapping: ColumnMapping = {}

  for (const header of headers) {
    const normalized = header.trim().toLowerCase()
    const field = IMPORTABLE_FIELDS.find(
      (candidate) =>
        !claimed.has(candidate.key) &&
        (candidate.key.toLowerCase() === normalized ||
          candidate.label.toLowerCase() === normalized ||
          candidate.aliases.includes(normalized))
    )

    if (field) {
      mapping[header] = field.key
      claimed.add(field.key)
    } else {
      mapping[header] = ''
    }
  }

  return mapping
}

/** Applies a column mapping to parsed rows, producing raw import rows. */
export function buildRawRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): CustomerImportRawRow[] {
  const mapped = Object.entries(mapping).filter(
    (entry): entry is [string, ImportableFieldKey] => entry[1] !== ''
  )

  return rows.map((row) => {
    const raw: CustomerImportRawRow = {}
    for (const [header, fieldKey] of mapped) {
      const value = row[header]
      if (value !== undefined && value !== '') raw[fieldKey] = value
    }
    return raw
  })
}

/** True once the required `name` field has a column mapped to it. */
export function isMappingComplete(mapping: ColumnMapping): boolean {
  return Object.values(mapping).includes('name')
}

/** A ready-to-download sample CSV: field labels as headers plus example rows. */
export function sampleTemplateCsv(): string {
  const headers = IMPORTABLE_FIELDS.map((field) => field.label)
  const examples: string[][] = [
    [
      'Marlon Grant',
      '',
      'Individual',
      'Mr',
      'Marlon',
      'Grant',
      'marlon.grant@example.com',
      '+1 876 555 0100',
      '',
      'JMD',
      'en',
      'CUST-1001',
    ],
    [
      'Blue Mountain Coffee Ltd',
      'Blue Mountain Coffee Ltd',
      'Business',
      '',
      '',
      '',
      'accounts@bluemountain.example',
      '+1 876 555 0142',
      '+1 876 555 0143',
      'USD',
      'en',
      'CUST-1002',
    ],
  ]

  return [headers, ...examples].map(toCsvLine).join('\r\n')
}

/** Escapes and joins one CSV record per RFC 4180. */
function toCsvLine(cells: string[]): string {
  return cells
    .map((cell) =>
      /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
    )
    .join(',')
}
