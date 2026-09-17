'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { importJobsClient } from '@/lib/client'
import { MAX_IMPORT_BYTES } from '@/types/integrations'

type Props = {
  sources: readonly string[]
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('read-failed'))
    reader.readAsText(file)
  })
}

export function ImportUploadForm({ sources }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const source = String(data.get('source') ?? '')
    const projectId = String(data.get('projectId') ?? '').trim()
    const input = form.querySelector<HTMLInputElement>('input[type="file"]')
    const file = input?.files?.[0]
    if (source === '' || !file) {
      setError({
        code: 'projects/invalid-import-upload',
        message: 'Choose a source and a file to upload.',
      })
      return
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError({
        code: 'projects/import-too-large',
        message: 'Import files must be 5 MB or smaller.',
      })
      return
    }
    setPending(true)
    setError(null)
    let content: string
    try {
      content = await readFileAsText(file)
    } catch {
      setPending(false)
      setError({
        code: 'projects/import-read-failed',
        message: 'The file could not be read as text.',
      })
      return
    }
    if (content.trim() === '') {
      setPending(false)
      setError({
        code: 'projects/invalid-import-upload',
        message: 'The file is empty.',
      })
      return
    }
    const result = await importJobsClient.create({
      source: source as
        | 'csv'
        | 'jira-csv'
        | 'jira-json'
        | 'trello-json'
        | 'asana-csv'
        | 'zoho-csv',
      ...(projectId === '' ? {} : { projectId }),
      filename: file.name.slice(0, 255),
      content,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/import-create-failed',
        message:
          result.error?.message ?? 'The import job could not be created.',
      })
      return
    }
    router.push(`/settings/imports/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AppError title="Import not started" error={error} variant="banner" />
      ) : null}
      <div>
        <Label htmlFor="import-source">Source</Label>
        <NativeSelect
          id="import-source"
          name="source"
          defaultValue={sources[0] ?? 'csv'}
        >
          {sources.map((source) => (
            <NativeSelectOption key={source} value={source}>
              {source}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Label htmlFor="import-project">Project ID (optional)</Label>
        <Input
          id="import-project"
          name="projectId"
          placeholder="Leave empty to decide per row"
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="import-file">File (5 MB or smaller)</Label>
        <Input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,.json,text/csv,application/json"
        />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Uploading…' : 'Upload and preview'}
        </Button>
      </div>
    </form>
  )
}
