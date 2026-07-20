import type { ParsedSheet } from '@/types/customer-import'

/**
 * Parses an uploaded CSV/TSV/XLSX file into a normalized `{ headers, rows }`
 * shape for the import wizard. Parsers are dynamically imported so the ~heavy
 * CSV/XLSX libraries never enter the initial bundle. Runs in the browser only.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'xlsx') return parseExcel(file)
  if (extension === 'xls')
    throw new Error(
      'Legacy .xls files are not supported. Save as .xlsx or CSV and try again.'
    )

  return parseDelimited(file)
}

/** Parses CSV/TSV/TXT via papaparse (delimiter auto-detected). */
async function parseDelimited(file: File): Promise<ParsedSheet> {
  const Papa = (await import('papaparse')).default

  return new Promise<ParsedSheet>((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(
          (header) => header.length > 0
        )
        if (headers.length === 0) {
          reject(new Error('No columns found. Add a header row and try again.'))
          return
        }

        const rows = result.data
          .map((row) => normalizeRow(row, headers))
          .filter(hasAnyValue)

        resolve({ headers, rows })
      },
      error: (error: unknown) =>
        reject(
          error instanceof Error ? error : new Error('Could not read the file.')
        ),
    })
  })
}

/** Parses XLSX via read-excel-file, treating the first row as headers. */
async function parseExcel(file: File): Promise<ParsedSheet> {
  const readXlsxFile = (await import('read-excel-file')).default

  const matrix = await readXlsxFile(file)
  if (matrix.length === 0)
    throw new Error('The spreadsheet is empty. Add a header row and try again.')

  const headers = matrix[0]
    .map((cell) => cellToString(cell))
    .map((h) => h.trim())
  const named = headers.filter((header) => header.length > 0)
  if (named.length === 0)
    throw new Error('No columns found. Add a header row and try again.')

  const rows = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {}
    headers.forEach((header, columnIndex) => {
      if (header.length === 0) return
      row[header] = cellToString(cells[columnIndex]).trim()
    })
    return row
  })

  return { headers: named, rows: rows.filter(hasAnyValue) }
}

/** Keeps only known headers and coerces every cell to a trimmed string. */
function normalizeRow(
  row: Record<string, string>,
  headers: string[]
): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const header of headers) normalized[header] = (row[header] ?? '').trim()

  return normalized
}

function hasAnyValue(row: Record<string, string>): boolean {
  return Object.values(row).some((value) => value !== '')
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)

  return String(cell)
}
