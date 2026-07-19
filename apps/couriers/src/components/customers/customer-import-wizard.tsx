'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import type { BillingCustomerImportResult } from '@876/billing/integration'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Progress, ProgressLabel } from '@876/ui/progress'

import { request } from '@/lib/client/request'
import {
  autoMapHeaders,
  buildFailedRowsCsv,
  buildImportRows,
  chunkRows,
  ignoredHeaders,
  parseCustomerCsv,
  type CsvRow,
  type ImportMapping,
  type ImportTargetField,
} from '@/lib/customers/import-mapping'
import type { CustomerImportRow } from '@/types/customer-management'

import { ImportMappingTable } from './import-mapping-table'
import { ImportResults, ImportSummaryCounts } from './import-results'

const MAX_FILE_SIZE = 5 * 1024 * 1024
type Step = 'upload' | 'map' | 'preview' | 'import' | 'summary'
type DuplicateStrategy = 'skip' | 'update'

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload',
  map: 'Map columns',
  preview: 'Preview',
  import: 'Import',
  summary: 'Summary',
}

type Props = {
  customersHref: string
  orgSlug: string
}

type ChunkOutcome =
  | { data: BillingCustomerImportResult; error: null }
  | { data: null; error: string }

export function CustomerImportWizard({ customersHref, orgSlug }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<CsvRow[]>([])
  const [mapping, setMapping] = useState<ImportMapping>({})
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>('skip')
  const [preview, setPreview] = useState<BillingCustomerImportResult | null>(
    null
  )
  const [summary, setSummary] = useState<BillingCustomerImportResult | null>(
    null
  )
  const [idempotencyKeys, setIdempotencyKeys] = useState<string[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentStep = STEP_LABELS[step]
  const ignored = ignoredHeaders(headers, mapping)
  const hasNameMapping = Object.values(mapping).includes('name')

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    setError(null)
    setFileName('')

    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a CSV file.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The CSV must be 5 MB or smaller.')
      return
    }

    const parsed = parseCustomerCsv(await file.text())
    if (parsed.error) {
      setError(parsed.error)
      return
    }

    setFileName(file.name)
    setHeaders(parsed.headers)
    setRawRows(parsed.rows)
    setMapping(autoMapHeaders(parsed.headers))
    setPreview(null)
    setSummary(null)
    setIdempotencyKeys([])
  }

  function updateMapping(header: string, target: ImportTargetField | null) {
    setMapping((current) => {
      const next = { ...current }

      if (target)
        for (const candidate of headers) {
          if (next[candidate] === target) next[candidate] = null
        }
      next[header] = target

      return next
    })
    setPreview(null)
  }

  function updateStrategy(value: DuplicateStrategy) {
    setDuplicateStrategy(value)
    setPreview(null)
    setSummary(null)
    setIdempotencyKeys([])
  }

  async function handlePreview() {
    setPending(true)
    setError(null)

    const chunks = chunkRows(buildImportRows(rawRows, mapping))
    const outcome = await submitChunks(chunks, true, [])
    setPending(false)

    if (outcome.error) {
      setError(outcome.error)
      return
    }

    setPreview(outcome.data)
  }

  async function handleImport() {
    setStep('import')
    setPending(true)
    setError(null)

    const chunks = chunkRows(buildImportRows(rawRows, mapping))
    const keys =
      idempotencyKeys.length === chunks.length
        ? idempotencyKeys
        : chunks.map(() => crypto.randomUUID())
    if (keys !== idempotencyKeys) setIdempotencyKeys(keys)

    const outcome = await submitChunks(chunks, false, keys)
    setPending(false)

    if (outcome.error) {
      setError(outcome.error)
      return
    }

    setSummary(outcome.data)
    setStep('summary')
  }

  async function submitChunks(
    chunks: CustomerImportRow[][],
    dryRun: boolean,
    keys: string[]
  ): Promise<ChunkOutcome> {
    let aggregate = emptyImportResult(dryRun, duplicateStrategy)
    setProgress({ completed: 0, total: chunks.length })

    for (let index = 0; index < chunks.length; index += 1) {
      const result = await request<BillingCustomerImportResult>(
        '/api/manage/customers/import',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-876-org-slug': orgSlug,
          },
          body: JSON.stringify({
            dryRun,
            duplicateStrategy,
            rows: chunks[index],
            ...(dryRun ? {} : { idempotencyKey: keys[index] }),
          }),
        }
      )

      if (result.error) return { data: null, error: result.error.message }

      aggregate = mergeImportResults(aggregate, result.data)
      setProgress({ completed: index + 1, total: chunks.length })
    }

    return { data: aggregate, error: null }
  }

  function downloadFailures() {
    if (!summary || summary.summary.failed === 0) return

    const csv = buildFailedRowsCsv(headers, rawRows, summary.results)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'customer-import-failures.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Import progress">
        {Object.values(STEP_LABELS).map((label) => (
          <li
            key={label}
            aria-current={label === currentStep ? 'step' : undefined}
            className={
              label === currentStep
                ? 'rounded-full bg-blue-700 px-3 py-1 text-xs font-medium text-white dark:bg-blue-900 dark:text-blue-50'
                : 'bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium'
            }
          >
            {label}
          </li>
        ))}
      </ol>

      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}

      {step === 'upload' && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Upload</h2>
          <div className="space-y-2 rounded-lg border p-5">
            <Label htmlFor="customer-import-file">CSV file</Label>
            <Input
              id="customer-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            <p className="text-muted-foreground text-xs">
              Maximum 5 MB and 2,000 data rows.
            </p>
            {fileName && (
              <p className="text-sm">
                {fileName} · {rawRows.length} rows
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="info"
              disabled={rawRows.length === 0}
              onClick={() => setStep('map')}
            >
              Continue
            </Button>
            <Link
              href={customersHref}
              className={buttonVariants({ variant: 'outline' })}
            >
              Cancel
            </Link>
          </div>
        </section>
      )}

      {step === 'map' && (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Map columns</h2>
            {ignored.length > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                Ignored: {ignored.join(', ')}
              </p>
            )}
          </div>
          <ImportMappingTable
            headers={headers}
            mapping={mapping}
            onChange={updateMapping}
          />
          {!hasNameMapping && (
            <p className="text-destructive text-sm">
              Map one CSV column to Name.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="info"
              disabled={!hasNameMapping}
              onClick={() => setStep('preview')}
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('upload')}
            >
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 'preview' && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Preview</h2>
          <fieldset className="space-y-3 rounded-lg border p-5">
            <legend className="px-1 text-sm font-medium">
              Duplicate strategy
            </legend>
            <StrategyOption
              value="skip"
              label="Skip duplicates"
              checked={duplicateStrategy === 'skip'}
              disabled={pending}
              onChange={updateStrategy}
            />
            <StrategyOption
              value="update"
              label="Update matched"
              checked={duplicateStrategy === 'update'}
              disabled={pending}
              onChange={updateStrategy}
            />
          </fieldset>
          {preview && (
            <>
              <ImportSummaryCounts result={preview} />
              <ImportResults result={preview} />
            </>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="info"
              disabled={pending}
              onClick={preview ? handleImport : handlePreview}
            >
              {preview ? 'Import' : 'Preview'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setStep('map')}
            >
              Back
            </Button>
          </div>
        </section>
      )}

      {step === 'import' && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Import</h2>
          <Progress
            value={
              progress.total === 0
                ? 0
                : (progress.completed / progress.total) * 100
            }
          >
            <ProgressLabel>Progress</ProgressLabel>
            <span className="text-muted-foreground ml-auto text-sm tabular-nums">
              {progress.completed} / {progress.total} chunks
            </span>
          </Progress>
          {!pending && error && (
            <Button type="button" variant="info" onClick={handleImport}>
              Retry
            </Button>
          )}
        </section>
      )}

      {step === 'summary' && summary && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Summary</h2>
          <ImportSummaryCounts result={summary} />
          <ImportResults result={summary} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={summary.summary.failed === 0}
              onClick={downloadFailures}
            >
              Download
            </Button>
            <Link
              href={customersHref}
              className={buttonVariants({ variant: 'info' })}
            >
              Done
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}

function StrategyOption({
  value,
  label,
  checked,
  disabled,
  onChange,
}: {
  value: DuplicateStrategy
  label: string
  checked: boolean
  disabled: boolean
  onChange: (value: DuplicateStrategy) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="duplicate-strategy"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="accent-info size-4"
      />
      {label}
    </label>
  )
}

function emptyImportResult(
  dryRun: boolean,
  duplicateStrategy: DuplicateStrategy
): BillingCustomerImportResult {
  return {
    object: 'customer_import',
    dryRun,
    duplicateStrategy,
    summary: { created: 0, updated: 0, skipped: 0, failed: 0 },
    results: [],
  }
}

function mergeImportResults(
  aggregate: BillingCustomerImportResult,
  next: BillingCustomerImportResult
): BillingCustomerImportResult {
  return {
    ...aggregate,
    summary: {
      created: aggregate.summary.created + next.summary.created,
      updated: aggregate.summary.updated + next.summary.updated,
      skipped: aggregate.summary.skipped + next.summary.skipped,
      failed: aggregate.summary.failed + next.summary.failed,
    },
    results: aggregate.results.concat(next.results),
  }
}
