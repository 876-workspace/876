'use client'

import { OneTimeSecret } from '@876/projects-ui/platform/one-time-secret'
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
import { generateWebhookSecret } from '@/lib/integration-mappers'

type Props = {
  endpointId: string
  initialUrl: string
  initialEventTypes: readonly string[]
  initialEnabled: boolean
  eventOptions: readonly string[]
}

export function WebhookEditForm({
  endpointId,
  initialUrl,
  initialEventTypes,
  initialEnabled,
  eventOptions,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)

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
    setSaved(false)
    const result = await webhookEndpointsClient.update(endpointId, {
      url,
      eventTypes,
      enabled,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/webhook-update-failed',
        message: result.error?.message ?? 'The endpoint could not be updated.',
      })
      return
    }
    setSaved(true)
    router.refresh()
  }

  async function onRotate() {
    if (pending) return
    const secret = generateWebhookSecret()
    setPending(true)
    setError(null)
    setSaved(false)
    setRotatedSecret(null)
    const result = await webhookEndpointsClient.update(endpointId, { secret })
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/webhook-rotate-failed',
        message: result.error?.message ?? 'The secret could not be rotated.',
      })
      return
    }
    setRotatedSecret(secret)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? (
          <AppError title="Endpoint not updated" error={error} variant="banner" />
        ) : null}
        {saved ? (
          <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
            Endpoint saved.
          </p>
        ) : null}
        <div>
          <Label htmlFor="webhook-edit-url">URL</Label>
          <Input
            id="webhook-edit-url"
            name="url"
            inputMode="url"
            defaultValue={initialUrl}
            autoComplete="off"
          />
        </div>
        <WebhookEventPicker options={eventOptions} defaultSelected={initialEventTypes} />
        <div className="flex items-center gap-2">
          <Checkbox
            id="webhook-edit-enabled"
            name="enabled"
            defaultChecked={initialEnabled}
          />
          <Label htmlFor="webhook-edit-enabled">Enabled</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save endpoint'}
          </Button>
          <Link
            href={`/settings/webhooks/${encodeURIComponent(endpointId)}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Cancel
          </Link>
        </div>
      </form>
      <section aria-label="Rotate secret" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Signing secret</h2>
        <p className="text-muted-foreground text-sm">
          Rotation replaces the signing secret immediately. The new value is shown
          once — update the receiver before rotating.
        </p>
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void onRotate()}
          >
            {pending ? 'Rotating…' : 'Rotate secret'}
          </Button>
        </div>
        {rotatedSecret !== null ? <OneTimeSecret secret={rotatedSecret} /> : null}
      </section>
    </div>
  )
}
