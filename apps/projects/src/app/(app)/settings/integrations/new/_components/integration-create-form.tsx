'use client'

import { IntegrationScopePicker } from '@876/projects-ui/platform/integration-scope-picker'
import { OneTimeSecret } from '@876/projects-ui/platform/one-time-secret'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { integrationClientsClient } from '@/lib/client'

export function IntegrationCreateForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || secret) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const scopes = form.getAll('scopes').map(String)
    if (name === '' || scopes.length === 0) {
      setError({
        code: 'projects/invalid-integration-client',
        message: 'Give the client a name and choose at least one scope.',
      })
      return
    }
    setPending(true)
    setError(null)
    const result = await integrationClientsClient.create({ name, scopes })
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/integration-create-failed',
        message: result.error?.message ?? 'The client could not be created.',
      })
      return
    }
    setClientName(result.data.client.name)
    setSecret(result.data.secret)
  }

  if (secret !== null) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm">
          {clientName === null ? 'Client created.' : `“${clientName}” created.`} Copy
          the secret now — it will not be shown again.
        </p>
        <OneTimeSecret secret={secret} />
        <div>
          <Link
            href="/settings/integrations"
            className={buttonVariants({ variant: 'outline' })}
          >
            Back to integrations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AppError title="Client not created" error={error} variant="banner" />
      ) : null}
      <div>
        <Label htmlFor="integration-client-name">Name</Label>
        <Input
          id="integration-client-name"
          name="name"
          maxLength={120}
          placeholder="CI sync"
          autoComplete="off"
        />
      </div>
      <IntegrationScopePicker />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create client'}
        </Button>
        <Link
          href="/settings/integrations"
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
