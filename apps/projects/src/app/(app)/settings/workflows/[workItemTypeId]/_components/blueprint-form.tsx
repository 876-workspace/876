'use client'

import { BlueprintEditor } from '@876/projects-ui/automation/blueprint-editor'
import type { Blueprint } from '@876/projects-ui/automation/types'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { workflowsClient } from '@/lib/client'
import { uiTransitionsToServiceInput } from '@/lib/automation-mappers'

export type BlueprintStateOption = { key: string; label: string }

type Props = {
  workItemTypeId: string
  typeName: string
  initial: Blueprint
  availableStates: readonly BlueprintStateOption[]
  availableFieldKeys: readonly string[]
  permissionOptions: readonly string[]
}

export function BlueprintForm({
  workItemTypeId,
  typeName,
  initial,
  availableStates,
  availableFieldKeys,
  permissionOptions,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const raw = new FormData(form).get('transitions')
    let transitions: Blueprint['transitions'] = []
    try {
      const parsed: unknown = JSON.parse(String(raw ?? '[]'))
      if (Array.isArray(parsed)) transitions = parsed as Blueprint['transitions']
    } catch {
      setError({
        code: 'projects/invalid-blueprint',
        message: 'The blueprint could not be read. Try again.',
      })
      return
    }

    setPending(true)
    setError(null)
    setSaved(false)
    const result = await workflowsClient.putBlueprint(
      workItemTypeId,
      uiTransitionsToServiceInput(transitions)
    )
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/blueprint-save-failed',
        message: result.error?.message ?? 'The blueprint could not be saved.',
      })
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AppError
          title={`${typeName} blueprint not saved`}
          error={error}
          variant="banner"
        />
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Blueprint saved.
        </p>
      ) : null}
      <BlueprintEditor
        initial={initial}
        availableStates={availableStates}
        availableFieldKeys={availableFieldKeys}
        permissionOptions={permissionOptions}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save blueprint'}
        </Button>
      </div>
    </form>
  )
}
