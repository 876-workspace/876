'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownFromLine,
  ArrowLeftIcon,
  ArrowUpFromLine,
  CheckCircleIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from '@876/ui/icons'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { customers } from '@/lib/client/customers'
import {
  autoMapHeaders,
  buildRawRows,
  isMappingComplete,
  sampleTemplateCsv,
  type ColumnMapping,
} from '@/lib/import/mapping'
import { parseSpreadsheet } from '@/lib/import/parse-spreadsheet'
import {
  CustomerImportRowSchema,
  IMPORTABLE_FIELDS,
  MAX_IMPORT_ROWS,
  type CustomerImportResult,
  type ParsedSheet,
} from '@/types/customer-import'

type Step = 'upload' | 'map' | 'preview' | 'result'

const ACCEPT = '.csv,.tsv,.txt,.xlsx'
const PREVIEW_LIMIT = 50

/** Four-step wizard: upload → map columns → preview & validate → result. */
export function CustomerImportWizard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<CustomerImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const rawRows = useMemo(
    () => (parsed ? buildRawRows(parsed.rows, mapping) : []),
    [parsed, mapping]
  )

  const validation = useMemo(
    () =>
      rawRows.map((row) => {
        const parsedRow = CustomerImportRowSchema.safeParse(row)
        return parsedRow.success
          ? { valid: true as const, name: parsedRow.data.name, reason: '' }
          : {
              valid: false as const,
              name: typeof row.name === 'string' ? row.name : '',
              reason:
                parsedRow.error.issues[0]?.message ??
                'Invalid customer details.',
            }
      }),
    [rawRows]
  )

  const validCount = validation.filter((row) => row.valid).length
  const invalidCount = validation.length - validCount

  async function handleFile(file: File) {
    setParseError(null)
    setIsParsing(true)
    try {
      const sheet = await parseSpreadsheet(file)

      if (sheet.rows.length === 0) {
        setParseError('No data rows found below the header.')
        return
      }
      if (sheet.rows.length > MAX_IMPORT_ROWS) {
        setParseError(
          `Files are limited to ${MAX_IMPORT_ROWS.toLocaleString()} rows. Split the file and import in batches.`
        )
        return
      }

      setFileName(file.name)
      setParsed(sheet)
      setMapping(autoMapHeaders(sheet.headers))
      setStep('map')
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : 'Could not read the file.'
      )
    } finally {
      setIsParsing(false)
    }
  }

  function assignColumn(header: string, field: ColumnMapping[string]) {
    setMapping((current) => {
      const next: ColumnMapping = { ...current, [header]: field }
      // A field maps to at most one column — clear any prior claim.
      if (field !== '')
        for (const key of Object.keys(next))
          if (key !== header && next[key] === field) next[key] = ''

      return next
    })
  }

  function downloadTemplate() {
    const blob = new Blob([sampleTemplateCsv()], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'customer-import-template.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function submit() {
    setSubmitError(null)
    startTransition(async () => {
      const response = await customers.import(rawRows)
      if (response.error || !response.data) {
        setSubmitError(response.error?.message ?? 'The import failed.')
        return
      }

      setResult(response.data)
      setStep('result')
    })
  }

  function reset() {
    setStep('upload')
    setFileName('')
    setParsed(null)
    setMapping({})
    setParseError(null)
    setSubmitError(null)
    setResult(null)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Stepper step={step} />

      {step === 'upload' && (
        <div className="876-card p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}
            className="border-input hover:border-ring hover:bg-muted/30 flex w-full flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors"
          >
            <ArrowUpFromLine className="text-muted-foreground size-8" />
            <div>
              <p className="text-sm font-medium">
                {isParsing
                  ? 'Reading file…'
                  : 'Drop a file here, or click to browse'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                CSV, TSV, or Excel (.xlsx) · up to{' '}
                {MAX_IMPORT_ROWS.toLocaleString()} rows
              </p>
            </div>
          </button>

          {parseError && (
            <p className="text-destructive mt-4 flex items-center gap-2 text-sm">
              <XCircleIcon className="size-4 shrink-0" />
              {parseError}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <p className="text-muted-foreground text-xs">
              New to importing? Start from the sample file.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <ArrowDownFromLine className="size-3.5" />
              Sample template
            </Button>
          </div>
        </div>
      )}

      {step === 'map' && parsed && (
        <div className="876-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="876-eyebrow">Map columns</span>
            <span className="text-muted-foreground text-xs">
              {fileName} · {parsed.rows.length.toLocaleString()} rows
            </span>
          </div>

          <p className="text-muted-foreground mb-4 text-sm">
            Match each column in your file to a customer field. Unmatched
            columns are ignored. A column mapped to{' '}
            <strong>Customer Name</strong> is required.
          </p>

          <div className="divide-y">
            {parsed.headers.map((header) => (
              <div
                key={header}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{header}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    e.g. {parsed.rows[0]?.[header] || '—'}
                  </p>
                </div>
                <NativeSelect
                  value={mapping[header] ?? ''}
                  onChange={(event) =>
                    assignColumn(
                      header,
                      event.target.value as ColumnMapping[string]
                    )
                  }
                  className="w-56 shrink-0"
                >
                  <NativeSelectOption value="">Don’t import</NativeSelectOption>
                  {IMPORTABLE_FIELDS.map((field) => (
                    <NativeSelectOption key={field.key} value={field.key}>
                      {field.label}
                      {field.required ? ' (required)' : ''}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeftIcon className="size-3.5" />
              Choose another file
            </Button>
            <Button
              variant="info"
              size="sm"
              disabled={!isMappingComplete(mapping)}
              onClick={() => setStep('preview')}
            >
              Continue
            </Button>
          </div>

          {!isMappingComplete(mapping) && (
            <p className="text-muted-foreground mt-2 text-right text-xs">
              Map a column to Customer Name to continue.
            </p>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="876-card p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="876-eyebrow mr-2">Preview</span>
            <Badge variant="success">{validCount} ready</Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive">{invalidCount} with errors</Badge>
            )}
          </div>

          <p className="text-muted-foreground mb-4 text-sm">
            Rows with errors are skipped. Customers already in this workspace
            (matched by email or external ID) are skipped automatically.
          </p>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawRows.slice(0, PREVIEW_LIMIT).map((row, index) => {
                  const check = validation[index]
                  return (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>{row.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.email || '—'}
                      </TableCell>
                      <TableCell>
                        {check.valid ? (
                          <span className="text-success inline-flex items-center gap-1 text-xs">
                            <CheckCircleIcon className="size-3.5" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-destructive inline-flex items-center gap-1 text-xs">
                            <TriangleAlertIcon className="size-3.5" />
                            {check.reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {rawRows.length > PREVIEW_LIMIT && (
            <p className="text-muted-foreground mt-2 text-xs">
              Showing the first {PREVIEW_LIMIT} of{' '}
              {rawRows.length.toLocaleString()} rows.
            </p>
          )}

          {submitError && (
            <p className="text-destructive mt-4 flex items-center gap-2 text-sm">
              <XCircleIcon className="size-4 shrink-0" />
              {submitError}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('map')}
              disabled={isPending}
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to mapping
            </Button>
            <Button
              variant="info"
              size="sm"
              disabled={validCount === 0 || isPending}
              onClick={submit}
            >
              {isPending
                ? 'Importing…'
                : `Import ${validCount.toLocaleString()} customer${validCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="876-card p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="876-eyebrow mr-2">Import complete</span>
            <Badge variant="success">{result.imported} imported</Badge>
            {result.skipped > 0 && (
              <Badge variant="secondary">{result.skipped} skipped</Badge>
            )}
            {result.failed > 0 && (
              <Badge variant="destructive">{result.failed} failed</Badge>
            )}
          </div>

          {result.imported > 0 && (
            <p className="text-muted-foreground mb-4 text-sm">
              {result.imported.toLocaleString()} of{' '}
              {result.total.toLocaleString()} rows were added as customers.
            </p>
          )}

          {result.rows.some((row) => row.status !== 'imported') && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows
                    .filter((row) => row.status !== 'imported')
                    .slice(0, PREVIEW_LIMIT)
                    .map((row) => (
                      <TableRow key={row.index}>
                        <TableCell className="text-muted-foreground">
                          {row.index + 1}
                        </TableCell>
                        <TableCell>{row.name || '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.reason ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              Import another file
            </Button>
            <Button
              variant="info"
              size="sm"
              onClick={() => {
                router.push('/customers')
                router.refresh()
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map columns' },
  { key: 'preview', label: 'Preview' },
  { key: 'result', label: 'Done' },
]

function Stepper({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((entry) => entry.key === step)

  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((entry, index) => {
        const state =
          index < activeIndex
            ? 'done'
            : index === activeIndex
              ? 'active'
              : 'todo'
        return (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              className={
                state === 'active'
                  ? 'bg-info text-info-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium'
                  : state === 'done'
                    ? 'bg-success/15 text-success flex size-6 items-center justify-center rounded-full text-xs font-medium'
                    : 'bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium'
              }
            >
              {index + 1}
            </span>
            <span
              className={
                state === 'todo' ? 'text-muted-foreground' : 'font-medium'
              }
            >
              {entry.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="text-muted-foreground mx-1">›</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
