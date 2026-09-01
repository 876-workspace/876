'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  AccountingImportResourceType,
  AccountingProviderImportCandidate,
} from '@876/billing/operator'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Loader2Icon } from '@876/ui/icons'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type LocalOption = {
  value: string
  label: string
  secondary: string | null
}

type Props = {
  connectionId: string
  resourceType: AccountingImportResourceType
  candidate: AccountingProviderImportCandidate
  localOptions: LocalOption[]
}

export function AdoptionRow({
  connectionId,
  resourceType,
  candidate,
  localOptions,
}: Props) {
  const router = useRouter()
  const [resourceId, setResourceId] = useState(candidate.mappedResourceId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'adopt' | 'release' | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const mapped = useMemo(
    () =>
      candidate.mappedResourceId
        ? localOptions.find(
            (option) => option.value === candidate.mappedResourceId
          ) ?? null
        : null,
    [candidate.mappedResourceId, localOptions]
  )

  function adopt() {
    if (!resourceId) {
      setError('Choose the matching Billing resource first.')
      return
    }
    setError(null)
    setPendingAction('adopt')
    startTransition(async () => {
      const result = await client.accountingProviders.connections.imports.adopt({
        connectionId,
        resourceType,
        resourceId,
        externalId: candidate.externalId,
      })
      if (result.error) {
        setError(result.error.message)
        setPendingAction(null)
        return
      }
      setPendingAction(null)
      router.refresh()
    })
  }

  function release() {
    if (!candidate.mappedResourceId) return
    setError(null)
    setPendingAction('release')
    startTransition(async () => {
      const result =
        await client.accountingProviders.connections.imports.release({
          connectionId,
          resourceType,
          resourceId: candidate.mappedResourceId!,
        })
      if (result.error) {
        setError(result.error.message)
        setPendingAction(null)
        return
      }
      setResourceId('')
      setPendingAction(null)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.9fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{candidate.name}</p>
          {candidate.status ? (
            <Badge variant="outline">{candidate.status}</Badge>
          ) : null}
          {candidate.mappedResourceId ? (
            <Badge variant="success">Mapped</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {candidate.secondary ?? candidate.externalId}
        </p>
      </div>

      {candidate.mappedResourceId ? (
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {mapped?.label ?? candidate.mappedResourceId}
          </p>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {mapped?.secondary ?? candidate.mappedResourceId}
          </p>
        </div>
      ) : (
        <NativeSelect
          aria-label={`Billing ${resourceType} for ${candidate.name}`}
          value={resourceId}
          onChange={(event) => setResourceId(event.target.value)}
          disabled={isPending}
          className="w-full"
        >
          <NativeSelectOption value="">Select Billing record…</NativeSelectOption>
          {localOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
              {option.secondary ? ` · ${option.secondary}` : ''}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}

      <div className="flex flex-col items-start gap-2 lg:items-end">
        {candidate.mappedResourceId ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={release}
          >
            {pendingAction === 'release' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Release
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={isPending || !resourceId}
            onClick={adopt}
          >
            {pendingAction === 'adopt' ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Adopt
          </Button>
        )}
        {error ? (
          <p role="alert" className="text-destructive max-w-xs text-xs lg:text-right">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
