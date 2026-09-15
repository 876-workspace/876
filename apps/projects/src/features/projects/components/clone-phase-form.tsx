'use client'

import type { MilestoneDetail } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { phasesClient } from '@/lib/client'

function keyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ClonePhaseForm({ phase }: { phase: MilestoneDetail }) {
  const router = useRouter()
  const [name, setName] = useState(`${phase.name} copy`)
  const [key, setKey] = useState(`${phase.key}-copy`)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedKey = keyFromName(key || name)
    if (!name.trim() || !resolvedKey || pending) return

    setPending(true)
    setError(null)
    const result = await phasesClient.clone(phase.id, {
      key: resolvedKey,
      name: name.trim(),
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/phase-clone-failed',
          message: 'The phase could not be cloned.',
        }
      )
      return
    }

    router.push(`/phases/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      {error ? <AppError title="Phase not cloned" error={error} variant="banner" /> : null}
      <div className="876-card space-y-2 p-4 text-sm">
        <p className="font-medium">Clone configuration</p>
        <p className="text-muted-foreground">
          Description, owner, dates, order and Phase custom-field values are copied.
          Work items, comments and activity are not copied. The new Phase starts open.
        </p>
      </div>
      <FormRow label="Name" htmlFor="phase-clone-name" required>
        <Input
          id="phase-clone-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </FormRow>
      <FormRow label="Key" htmlFor="phase-clone-key" required>
        <Input
          id="phase-clone-key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder={keyFromName(name)}
        />
      </FormRow>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={pending || !name.trim() || !keyFromName(key || name)}>
          {pending ? 'Cloning…' : 'Clone phase'}
        </Button>
      </div>
    </form>
  )
}
