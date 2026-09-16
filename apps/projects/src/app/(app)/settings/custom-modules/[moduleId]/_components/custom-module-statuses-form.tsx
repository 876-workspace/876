'use client'

import type { CustomModuleStatus } from '@876/projects/contracts'
import { StatusEditor } from '@876/projects-ui/custom-modules/status-editor'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { customModuleStatusesClient } from '@/lib/client'

type StatusCategory = 'open' | 'in-progress' | 'done'

export function CustomModuleStatusesForm({
  moduleId,
  initial,
}: {
  moduleId: string
  initial: readonly CustomModuleStatus[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const raw = new FormData(event.currentTarget).get('statuses')
    let statuses: { key: string; label: string; category: StatusCategory }[]
    try {
      const parsed: unknown = JSON.parse(String(raw ?? '[]'))
      if (!Array.isArray(parsed)) throw new Error('invalid')
      statuses = parsed as typeof statuses
    } catch {
      setError({
        code: 'projects/custom-module-status-invalid',
        message: 'The status list could not be read.',
      })
      return
    }

    setPending(true)
    setError(null)
    setSaved(false)
    const result = await customModuleStatusesClient.replace(moduleId, statuses)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {error ? <AppError title="Statuses not saved" error={error} variant="banner" /> : null}
      {saved ? <p className="text-sm text-emerald-600">Statuses saved.</p> : null}
      <StatusEditor
        initial={[...initial]
          .sort((a, b) => a.position - b.position)
          .map((status) => ({
            key: status.key,
            label: status.label,
            category: status.category,
            position: status.position,
          }))}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save statuses'}
      </Button>
    </form>
  )
}
