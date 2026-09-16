'use client'

import { WebhookEventPicker } from '@876/projects-ui/platform/webhook-event-picker'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { webhookEndpointsClient } from '@/lib/client'

type Props = {
  eventOptions: readonly string[]
}

export function WebhookCreateForm({ eventOptions }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const url = String(form.get('url') ?? '').trim()
    const eventTypes = form.getAll('eventTypes').map(String)
    const enabled = form.get('enabled') === 'on'
    if (!url.startsWith('https://') || eventTypes.length === 0) {
      setError({
        code: 'projects/invalid-webhook-endpoint',
        message: 'Enter an https URL and choose at least one event type.',
      })
      return
    }
    setPending(true)
    setError(null)
    const result = await webhookEndpointsClient.create({ url, eventTypes, enabled })
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/webhook-create-failed',
        message: result.error?.message ?? 'The endpoint could not be created.',
      })
      return
    }
    router.push('/settings/webhooks')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AppError title="Endpoint not created" error={error} variant="banner" />
      ) : null}
      <div>
        <Label htmlFor="webhook-endpoint-url">URL</Label>
        <Input
          id="webhook-endpoint-url"
          name="url"
          inputMode="url"
          placeholder="https://hooks.example.com/projects"
          autoComplete="off"
        />
      </div>
      <WebhookEventPicker options={eventOptions} />
      <div className="flex items-center gap-2">
        <Checkbox id="webhook-endpoint-enabled" name="enabled" defaultChecked />
        <Label htmlFor="webhook-endpoint-enabled">Enabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create endpoint'}
        </Button>
        <Link
          href="/settings/webhooks"
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
