import type {
  StatementFileMapping,
  StatementPreviewError,
  StatementPreviewLine,
} from './banking-statement-file.schemas'

export class StatementFileParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StatementFileParseError'
  }
}

type ParsedRow = { rowNumber: number; values: string[] }

type PreviewResult = {
  headers: string[]
  totalRows: number
  lines: StatementPreviewLine[]
  errors: StatementPreviewError[]
}

function parseDelimited(content: string, delimiter: ',' | '\t'): ParsedRow[] {
  const source = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
  const rows: ParsedRow[] = []
  let values: string[] = []
  let field = ''
  let quoted = false
  let physicalLine = 1
  let rowStartLine = 1

  const finishRow = () => {
    values.push(field)
    const isBlank = values.every((value) => value.trim() === '')
    if (!isBlank) rows.push({ rowNumber: rowStartLine, values })
    values = []
    field = ''
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      if (quoted) {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else if (field.length === 0) {
        quoted = true
      } else {
        field += char
      }
      continue
    }

    if (char === delimiter && !quoted) {
      values.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      finishRow()
      if (char === '\r' && source[index + 1] === '\n') index += 1
      physicalLine += 1
      rowStartLine = physicalLine
      continue
    }

    if (char === '\n') physicalLine += 1
    field += char
  }

  if (quoted) throw new StatementFileParseError('The statement has an unterminated quoted field.')
  if (field.length > 0 || values.length > 0) finishRow()

  return rows
}

function headersFrom(row: ParsedRow): string[] {
  const headers = row.values.map((value) => value.trim())
  if (headers.some((header) => !header))
    throw new StatementFileParseError('Every statement column must have a header.')

  const seen = new Set<string>()
  for (const header of headers) {
    if (seen.has(header))
      throw new StatementFileParseError(`The statement contains the duplicate header "${header}".`)
    seen.add(header)
  }

  return headers
}

function rowRecord(headers: string[], row: ParsedRow): Record<string, string> {
  if (row.values.length > headers.length)
    throw new StatementFileParseError(
      `Row ${row.rowNumber} contains more columns than the header row.`
    )

  return Object.fromEntries(
    headers.map((header, index) => [header, row.values[index]?.trim() ?? ''])
  )
}

function requiredColumn(
  record: Record<string, string>,
  column: string,
  rowNumber: number
): string {
  if (!(column in record))
    throw new StatementFileParseError(`The mapped column "${column}" does not exist.`)
  const value = record[column]?.trim() ?? ''
  if (!value)
    throw new StatementFileParseError(
      `Row ${rowNumber} is missing a value in "${column}".`
    )
  return value
}

function optionalColumn(
  record: Record<string, string>,
  column: string | null | undefined
): string | null {
  if (!column) return null
  if (!(column in record))
    throw new StatementFileParseError(`The mapped column "${column}" does not exist.`)
  const value = record[column]?.trim() ?? ''
  return value || null
}

function parseStatementDate(value: string, format: StatementFileMapping['dateFormat']): number {
  const separator = format.includes('/') ? '/' : '-'
  const parts = value.trim().split(separator)
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part)))
    throw new StatementFileParseError(`Date "${value}" does not match ${format}.`)

  let year: number
  let month: number
  let day: number
  if (format === 'yyyy-mm-dd') {
    year = Number(parts[0])
    month = Number(parts[1])
    day = Number(parts[2])
  } else if (format.startsWith('dd')) {
    day = Number(parts[0])
    month = Number(parts[1])
    year = Number(parts[2])
  } else {
    month = Number(parts[0])
    day = Number(parts[1])
    year = Number(parts[2])
  }

  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31)
    throw new StatementFileParseError(`Date "${value}" is outside the supported range.`)

  const timestamp = Date.UTC(year, month - 1, day) / 1000
  const date = new Date(timestamp * 1000)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new StatementFileParseError(`Date "${value}" is not a valid calendar date.`)

  return timestamp
}

function normalizeAmountText(
  raw: string,
  mapping: StatementFileMapping
): { digits: string; negative: boolean } {
  let value = raw.trim().replace(/\u00a0/g, ' ')
  if (!value) throw new StatementFileParseError('Amount is blank.')

  let negative = false
  if (value.startsWith('(') && value.endsWith(')')) {
    negative = true
    value = value.slice(1, -1).trim()
  }
  if (value.startsWith('-')) {
    negative = !negative
    value = value.slice(1).trim()
  } else if (value.startsWith('+')) {
    value = value.slice(1).trim()
  }

  // Accept common currency symbols and an optional three-letter currency code
  // while keeping the numeric grammar strict after normalization.
  value = value.replace(/^[$£€¥]\s*/, '').replace(/\s*[$£€¥]$/, '')
  value = value.replace(/^[A-Za-z]{3}\s*/, '').replace(/\s*[A-Za-z]{3}$/, '')

  const { decimalSeparator, thousandsSeparator } = mapping.numberFormat
  if (
    thousandsSeparator !== 'none' &&
    thousandsSeparator !== 'space' &&
    thousandsSeparator === decimalSeparator
  )
    throw new StatementFileParseError(
      'Decimal and thousands separators must be different.'
    )

  if (thousandsSeparator === 'space') value = value.replace(/\s+/g, '')
  else if (thousandsSeparator !== 'none')
    value = value.split(thousandsSeparator).join('')
  else value = value.replace(/\s+/g, '')

  if (decimalSeparator === ',') value = value.replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(value))
    throw new StatementFileParseError(`Amount "${raw}" is not a valid number.`)

  return { digits: value, negative }
}

function decimalToMinorUnits(
  raw: string,
  decimalPlaces: number,
  mapping: StatementFileMapping
): bigint {
  const { digits, negative } = normalizeAmountText(raw, mapping)
  const [whole, fraction = ''] = digits.split('.')
  if (fraction.length > decimalPlaces) {
    const extra = fraction.slice(decimalPlaces)
    if (!/^0*$/.test(extra))
      throw new StatementFileParseError(
        `Amount "${raw}" has more than ${decimalPlaces} decimal places.`
      )
  }

  const normalizedFraction = fraction
    .slice(0, decimalPlaces)
    .padEnd(decimalPlaces, '0')
  const magnitude = BigInt(`${whole}${normalizedFraction}` || '0')
  return negative ? -magnitude : magnitude
}

function directionAndAmount(
  record: Record<string, string>,
  mapping: StatementFileMapping,
  decimalPlaces: number,
  rowNumber: number
): { type: 'credit' | 'debit'; amount: bigint } {
  if (mapping.amountMode === 'signed') {
    const source = requiredColumn(record, mapping.amountColumn, rowNumber)
    const signed = decimalToMinorUnits(source, decimalPlaces, mapping)
    if (signed === 0n)
      throw new StatementFileParseError(`Row ${rowNumber} has a zero amount.`)

    const positive = mapping.positiveDirection
    const type = signed > 0n ? positive : positive === 'credit' ? 'debit' : 'credit'
    return { type, amount: signed < 0n ? -signed : signed }
  }

  const debitRaw = optionalColumn(record, mapping.debitColumn)
  const creditRaw = optionalColumn(record, mapping.creditColumn)
  const debit = debitRaw
    ? decimalToMinorUnits(debitRaw, decimalPlaces, mapping)
    : 0n
  const credit = creditRaw
    ? decimalToMinorUnits(creditRaw, decimalPlaces, mapping)
    : 0n

  if (debit < 0n || credit < 0n)
    throw new StatementFileParseError(
      `Row ${rowNumber} uses negative values in separate debit/credit columns.`
    )
  if (debit > 0n && credit > 0n)
    throw new StatementFileParseError(
      `Row ${rowNumber} has values in both debit and credit columns.`
    )
  if (debit === 0n && credit === 0n)
    throw new StatementFileParseError(`Row ${rowNumber} has no transaction amount.`)

  return debit > 0n
    ? { type: 'debit', amount: debit }
    : { type: 'credit', amount: credit }
}

function rowError(
  rowNumber: number,
  error: unknown
): StatementPreviewError {
  return {
    rowNumber,
    field: 'row',
    message:
      error instanceof StatementFileParseError
        ? error.message
        : 'The statement row could not be parsed.',
  }
}

export function previewDelimitedStatement(options: {
  content: string
  format: 'csv' | 'tsv'
  currency: string
  decimalPlaces: number
  mapping: StatementFileMapping
}): PreviewResult {
  const rows = parseDelimited(options.content, options.format === 'csv' ? ',' : '\t')
  const headerRow = rows[0]
  if (!headerRow || rows.length < 2)
    throw new StatementFileParseError(
      'The statement must contain a header row and at least one transaction row.'
    )

  const headers = headersFrom(headerRow)
  const dataRows = rows.slice(1)
  const lines: StatementPreviewLine[] = []
  const errors: StatementPreviewError[] = []

  for (const row of dataRows) {
    try {
      const record = rowRecord(headers, row)
      const dateRaw = requiredColumn(
        record,
        options.mapping.dateColumn,
        row.rowNumber
      )
      const { type, amount } = directionAndAmount(
        record,
        options.mapping,
        options.decimalPlaces,
        row.rowNumber
      )
      const balanceRaw = optionalColumn(record, options.mapping.balanceColumn)
      const runningBalance = balanceRaw
        ? decimalToMinorUnits(
            balanceRaw,
            options.decimalPlaces,
            options.mapping
          ).toString()
        : null

      lines.push({
        sourceRowNumber: row.rowNumber,
        externalId: optionalColumn(record, options.mapping.externalIdColumn),
        postedAt: parseStatementDate(dateRaw, options.mapping.dateFormat),
        type,
        amount: amount.toString(),
        currency: options.currency,
        description: optionalColumn(record, options.mapping.descriptionColumn),
        payee: optionalColumn(record, options.mapping.payeeColumn),
        reference: optionalColumn(record, options.mapping.referenceColumn),
        runningBalance,
      })
    } catch (error) {
      errors.push(rowError(row.rowNumber, error))
    }
  }

  return {
    headers,
    totalRows: dataRows.length,
    lines,
    errors,
  }
}
