'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { importJobsClient } from '@/lib/client'

type Props = {
  jobId: string
  status: string
  failureCount: number
}

export function ImportJobCommitPanel({ jobId, status, failureCount }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [committed, setCommitted] = useState(false)

  const committable = status === 'preview' || status === 'partial'

  async function onCommit() {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await importJobsClient.commit(jobId)
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/import-commit-failed',
        message: result.error?.message ?? 'The import could not be committed.',
      })
      return
    }
    setCommitted(true)
    router.refresh()
  }

  return (
    <section aria-label="Commit import" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Commit</h2>
      {failureCount > 0 ? (
        <p className="text-muted-foreground text-sm">
          {failureCount} {failureCount === 1 ? 'row has' : 'rows have'} errors and will
          be skipped. Committing is idempotent per job and row.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Committing writes the previewed rows. Committing is idempotent per job
          and row.
        </p>
      )}
      {error ? (
        <AppError title="Import not committed" error={error} variant="banner" />
      ) : null}
      {committed ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Import committed.
        </p>
      ) : null}
      <div>
        <Button type="button" disabled={pending || !committable} onClick={() => void onCommit()}>
          {pending ? 'Committing…' : 'Commit import'}
        </Button>
      </div>
    </section>
  )
}
