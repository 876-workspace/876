export type CsvTable = {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): CsvTable {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let quoted = false
  let rowHasContent = false
  const pushField = () => {
    current.push(field)
    field = ''
  }
  const pushRow = () => {
    rows.push(current)
    current = []
    rowHasContent = false
  }
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    rowHasContent = rowHasContent || char !== '\n'
    if (quoted) {
      if (char === '"') {
        if (normalized[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      rowHasContent = true
    } else if (char === ',') {
      pushField()
    } else if (char === '\n') {
      pushField()
      pushRow()
    } else {
      field += char
    }
  }
  if (quoted) throw new Error('csv/unclosed-quote')
  if (field !== '' || current.length > 0) {
    pushField()
    if (current.length > 1 || current[0] !== '' || rowHasContent) pushRow()
  }
  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = (rows[0] ?? []).map((header) => header.trim())
  const body = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) =>
      headers.map((_, column) => (row[column] ?? '').trim())
    )
  return { headers, rows: body }
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[\s_]+/g, '').replaceAll('-', '')
}

export function rowToRecord(
  headers: string[],
  row: string[]
): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((header, index) => {
    record[normalizeHeader(header)] = row[index] ?? ''
  })
  return record
}
