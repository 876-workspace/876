'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  BankStatementPreview,
  StatementDateFormat,
  StatementFileMapping,
} from '@876/billing'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { formatMoney } from '@/lib/format'

type AmountMode = 'signed' | 'debit-credit'
type Format = 'csv' | 'tsv'
type DecimalSeparator = '.' | ','
type ThousandsSeparator = ',' | '.' | 'space' | 'none'

const DATE_FORMATS: Array<{ value: StatementDateFormat; label: string }> = [
  { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
  { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
  { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'dd-mm-yyyy', label: 'DD-MM-YYYY' },
  { value: 'mm-dd-yyyy', label: 'MM-DD-YYYY' },
]

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function guess(headers: string[], candidates: string[]): string {
  const wanted = candidates.map(normalized)
  return headers.find((header) => wanted.includes(normalized(header))) ?? ''
}

function parseHeader(content: string, format: Format): string[] {
  const delimiter = format === 'tsv' ? '\t' : ','
  const fields: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === delimiter && !quoted) {
      fields.push(field.trim())
      field = ''
      continue
    }
    if ((char === '\r' || char === '\n') && !quoted) {
      fields.push(field.trim())
      break
    }
    field += char
  }

  if (!fields.length && field) fields.push(field.trim())
  return fields.filter(Boolean)
}

export function StatementImportForm({
  accountId,
  currency,
}: {
  accountId: string
  currency: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [content, setContent] = useState('')
  const [format, setFormat] = useState<Format>('csv')
  const [headers, setHeaders] = useState<string[]>([])
  const [dateColumn, setDateColumn] = useState('')
  const [dateFormat, setDateFormat] =
    useState<StatementDateFormat>('dd/mm/yyyy')
  const [descriptionColumn, setDescriptionColumn] = useState('')
  const [payeeColumn, setPayeeColumn] = useState('')
  const [referenceColumn, setReferenceColumn] = useState('')
  const [externalIdColumn, setExternalIdColumn] = useState('')
  const [balanceColumn, setBalanceColumn] = useState('')
  const [amountMode, setAmountMode] = useState<AmountMode>('signed')
  const [amountColumn, setAmountColumn] = useState('')
  const [debitColumn, setDebitColumn] = useState('')
  const [creditColumn, setCreditColumn] = useState('')
  const [positiveDirection, setPositiveDirection] = useState<'credit' | 'debit'>(
    'credit'
  )
  const [decimalSeparator, setDecimalSeparator] =
    useState<DecimalSeparator>('.')
  const [thousandsSeparator, setThousandsSeparator] =
    useState<ThousandsSeparator>(',')
  const [preview, setPreview] = useState<BankStatementPreview | null>(null)

  const mapping = useMemo<StatementFileMapping | null>(() => {
    if (!dateColumn) return null
    const shared = {
      dateColumn,
      dateFormat,
      descriptionColumn: descriptionColumn || null,
      payeeColumn: payeeColumn || null,
      referenceColumn: referenceColumn || null,
      externalIdColumn: externalIdColumn || null,
      balanceColumn: balanceColumn || null,
      numberFormat: { decimalSeparator, thousandsSeparator },
    }
    if (amountMode === 'signed') {
      if (!amountColumn) return null
      return {
        ...shared,
        amountMode: 'signed',
        amountColumn,
        positiveDirection,
      }
    }
    if (!debitColumn || !creditColumn) return null
    return {
      ...shared,
      amountMode: 'debit-credit',
      debitColumn,
      creditColumn,
    }
  }, [
    amountColumn,
    amountMode,
    balanceColumn,
    creditColumn,
    dateColumn,
    dateFormat,
    debitColumn,
    decimalSeparator,
    descriptionColumn,
    externalIdColumn,
    payeeColumn,
    positiveDirection,
    referenceColumn,
    thousandsSeparator,
  ])

  // A preview certifies exactly one file + mapping. Any edit invalidates it so
  // import can never silently use a mapping the user did not preview.
  useEffect(() => {
    setPreview(null)
  }, [content, format, mapping])

  async function chooseFile(file: File | null) {
    setError(null)
    if (!file) {
      setContent('')
      setSourceName('')
      setHeaders([])
      return
    }

    const nextFormat: Format = file.name.toLowerCase().endsWith('.tsv')
      ? 'tsv'
      : 'csv'
    const text = await file.text()
    const nextHeaders = parseHeader(text, nextFormat)
    setSourceName(file.name)
    setContent(text)
    setFormat(nextFormat)
    setHeaders(nextHeaders)
    setDateColumn(guess(nextHeaders, ['date', 'transaction date', 'posted date']))
    setDescriptionColumn(
      guess(nextHeaders, ['description', 'details', 'narrative', 'memo'])
    )
    setPayeeColumn(guess(nextHeaders, ['payee', 'merchant', 'beneficiary']))
    setReferenceColumn(
      guess(nextHeaders, [
        'reference',
        'ref',
        'transaction reference',
        'cheque number',
      ])
    )
    setExternalIdColumn(
      guess(nextHeaders, [
        'transaction id',
        'transaction number',
        'id',
        'external id',
      ])
    )
    setBalanceColumn(guess(nextHeaders, ['balance', 'running balance']))
    const guessedDebit = guess(nextHeaders, [
      'debit',
      'withdrawal',
      'withdrawals',
    ])
    const guessedCredit = guess(nextHeaders, ['credit', 'deposit', 'deposits'])
    if (guessedDebit && guessedCredit) {
      setAmountMode('debit-credit')
      setDebitColumn(guessedDebit)
      setCreditColumn(guessedCredit)
      setAmountColumn('')
    } else {
      setAmountMode('signed')
      setAmountColumn(guess(nextHeaders, ['amount', 'transaction amount']))
      setDebitColumn('')
      setCreditColumn('')
    }
  }

  function changeDecimalSeparator(next: DecimalSeparator) {
    setDecimalSeparator(next)
    if (thousandsSeparator === next)
      setThousandsSeparator(next === '.' ? ',' : '.')
  }

  function changeThousandsSeparator(next: ThousandsSeparator) {
    setThousandsSeparator(next)
    if (next === decimalSeparator)
      setDecimalSeparator(decimalSeparator === '.' ? ',' : '.')
  }

  function runPreview() {
    if (!content || !mapping) {
      setError('Choose a statement and map the date and amount columns first.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await client.bankStatementImports.previewFile(accountId, {
        format,
        content,
        currency,
        mapping,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not preview this statement.')
        return
      }
      setPreview(result.data)
    })
  }

  function importStatement() {
    if (!content || !mapping || !preview || preview.invalidRows > 0) return
    setError(null)
    startTransition(async () => {
      const result = await client.bankStatementImports.importFile(accountId, {
        format,
        content,
        currency,
        mapping,
        sourceName: sourceName || null,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not import this statement.')
        return
      }
      router.push(`/banking/${accountId}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="876-card space-y-5 p-5">
        <div>
          <h2 className="font-semibold">Statement file</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            CSV and TSV are supported. Nothing is booked during preview.
          </p>
        </div>
        <Input
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values"
          onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
        />
        {sourceName ? (
          <p className="text-muted-foreground text-sm">
            {sourceName} · {currency} · {format.toUpperCase()}
          </p>
        ) : null}
      </section>

      {headers.length ? (
        <section className="876-card grid gap-5 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-semibold">Map statement columns</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Map the bank&apos;s columns to 876 Banking. You can adjust this until
              the preview is correct.
            </p>
          </div>
          <ColumnSelect
            label="Date column"
            value={dateColumn}
            headers={headers}
            required
            onChange={setDateColumn}
          />
          <Field label="Date format">
            <NativeSelect
              value={dateFormat}
              onChange={(event) =>
                setDateFormat(event.target.value as StatementDateFormat)
              }
            >
              {DATE_FORMATS.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Decimal separator">
            <NativeSelect
              value={decimalSeparator}
              onChange={(event) =>
                changeDecimalSeparator(event.target.value as DecimalSeparator)
              }
            >
              <NativeSelectOption value=".">Period (1,234.56)</NativeSelectOption>
              <NativeSelectOption value=",">Comma (1.234,56)</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Thousands separator">
            <NativeSelect
              value={thousandsSeparator}
              onChange={(event) =>
                changeThousandsSeparator(
                  event.target.value as ThousandsSeparator
                )
              }
            >
              <NativeSelectOption value=",">Comma</NativeSelectOption>
              <NativeSelectOption value=".">Period</NativeSelectOption>
              <NativeSelectOption value="space">Space</NativeSelectOption>
              <NativeSelectOption value="none">None</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field label="Amount layout">
            <NativeSelect
              value={amountMode}
              onChange={(event) =>
                setAmountMode(event.target.value as AmountMode)
              }
            >
              <NativeSelectOption value="signed">Single amount column</NativeSelectOption>
              <NativeSelectOption value="debit-credit">
                Separate debit / credit columns
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          {amountMode === 'signed' ? (
            <>
              <ColumnSelect
                label="Amount column"
                value={amountColumn}
                headers={headers}
                required
                onChange={setAmountColumn}
              />
              <Field label="Positive amounts mean">
                <NativeSelect
                  value={positiveDirection}
                  onChange={(event) =>
                    setPositiveDirection(
                      event.target.value as 'credit' | 'debit'
                    )
                  }
                >
                  <NativeSelectOption value="credit">
                    Money in / credit
                  </NativeSelectOption>
                  <NativeSelectOption value="debit">
                    Money out / debit
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </>
          ) : (
            <>
              <ColumnSelect
                label="Debit / withdrawal column"
                value={debitColumn}
                headers={headers}
                required
                onChange={setDebitColumn}
              />
              <ColumnSelect
                label="Credit / deposit column"
                value={creditColumn}
                headers={headers}
                required
                onChange={setCreditColumn}
              />
            </>
          )}
          <ColumnSelect
            label="Description"
            value={descriptionColumn}
            headers={headers}
            onChange={setDescriptionColumn}
          />
          <ColumnSelect
            label="Payee / merchant"
            value={payeeColumn}
            headers={headers}
            onChange={setPayeeColumn}
          />
          <ColumnSelect
            label="Reference"
            value={referenceColumn}
            headers={headers}
            onChange={setReferenceColumn}
          />
          <ColumnSelect
            label="Bank transaction ID"
            value={externalIdColumn}
            headers={headers}
            onChange={setExternalIdColumn}
          />
          <ColumnSelect
            label="Running balance"
            value={balanceColumn}
            headers={headers}
            onChange={setBalanceColumn}
          />
          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={runPreview}
              disabled={isPending || !mapping}
            >
              {isPending ? 'Previewing…' : 'Preview statement'}
            </Button>
          </div>
        </section>
      ) : null}

      {preview ? (
        <section className="876-card overflow-hidden">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Preview</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {preview.validRows} valid · {preview.invalidRows} invalid ·{' '}
                {preview.totalRows} total
              </p>
            </div>
            <Button
              type="button"
              onClick={importStatement}
              disabled={
                isPending ||
                preview.invalidRows > 0 ||
                preview.validRows === 0
              }
            >
              {isPending ? 'Importing…' : 'Import statement'}
            </Button>
          </div>
          {preview.errors.length ? (
            <div className="border-destructive/30 bg-destructive/5 border-b px-5 py-4">
              <p className="text-destructive text-sm font-medium">
                Fix the mapping or source rows before importing.
              </p>
              <ul className="text-destructive mt-2 space-y-1 text-sm">
                {preview.errors.slice(0, 10).map((item) => (
                  <li key={`${item.rowNumber}-${item.field}-${item.message}`}>
                    Row {item.rowNumber}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {preview.lines.slice(0, 20).map((line) => (
                  <tr key={line.sourceRowNumber}>
                    <td className="px-5 py-3">
                      {new Date(line.postedAt * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {line.payee ?? line.description ?? '—'}
                    </td>
                    <td className="px-5 py-3">{line.reference ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {line.type === 'debit' ? '-' : '+'}
                      {formatMoney(line.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}

function ColumnSelect({
  label,
  value,
  headers,
  required = false,
  onChange,
}: {
  label: string
  value: string
  headers: string[]
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <NativeSelect
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">Not mapped</NativeSelectOption>
        {headers.map((header) => (
          <NativeSelectOption key={header} value={header}>
            {header}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
