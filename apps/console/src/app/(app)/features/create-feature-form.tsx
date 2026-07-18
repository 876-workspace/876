'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminApp } from '@876/admin'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

type Props = {
  apps: AdminApp[]
  defaultAppId?: string | null
  defaultDescription?: string
  defaultName?: string
  defaultSlug?: string
  parentFeatureId?: string | null
  lockApp?: boolean
  returnHref?: string
}

export function CreateFeatureForm({
  apps,
  defaultAppId = null,
  defaultDescription = '',
  defaultName = '',
  defaultSlug = '',
  parentFeatureId = null,
  lockApp = false,
  returnHref = '/features',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(defaultName)
  const defaultApp = apps.find((app) => app.id === defaultAppId)
  const initialSlug =
    defaultSlug || (defaultApp ? `${defaultApp.feature_prefix}_` : 'platform_')
  const [slug, setSlug] = useState(initialSlug)
  const [description, setDescription] = useState(defaultDescription)
  const [scope, setScope] = useState('global')
  const [defaultEnabled, setDefaultEnabled] = useState(false)
  const [defaultValue, setDefaultValue] = useState(false)
  const [consumerDefaultEnabled, setConsumerDefaultEnabled] = useState(false)
  const [serverSideOnly, setServerSideOnly] = useState(true)
  const [appId, setAppId] = useState(defaultAppId ?? '')

  const selectedApp = apps.find((app) => app.id === appId)

  function handleAppChange(nextAppId: string) {
    const previousPrefix = selectedApp
      ? `${selectedApp.feature_prefix}_`
      : 'platform_'
    const nextApp = apps.find((app) => app.id === nextAppId)
    const nextPrefix = nextApp ? `${nextApp.feature_prefix}_` : 'platform_'

    setAppId(nextAppId)
    setSlug((current) =>
      current.startsWith(previousPrefix)
        ? `${nextPrefix}${current.slice(previousPrefix.length)}`
        : current
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return

    setError(null)
    startTransition(async () => {
      const { data, error: resultError } = await client.features.create({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        scope,
        default_enabled: defaultEnabled,
        default_value: defaultValue,
        consumer_default_enabled: consumerDefaultEnabled,
        server_side_only: serverSideOnly,
        parent_feature_id: parentFeatureId,
        app_id: appId || null,
      })
      if (resultError || !data) {
        setError(resultError?.message ?? 'Failed to create feature.')
        return
      }

      if (selectedApp) {
        router.push(`/apps/${selectedApp.slug}/features/${data.id}`)
      } else {
        router.push(`/features/${data.id}`)
      }
      router.refresh()
    })
  }

  return (
    <form className="876-card max-w-2xl" onSubmit={handleSubmit}>
      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="feature-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="feature-name"
              placeholder="e.g. Dark Mode"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature-slug">Slug</Label>
            <Input
              id="feature-slug"
              placeholder="e.g. dark_mode"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Keys for this app must start with{' '}
              <code>
                {selectedApp ? `${selectedApp.feature_prefix}_` : 'platform_'}
              </code>
              .
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature-description">Description</Label>
          <Textarea
            id="feature-description"
            placeholder="Optional description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {lockApp ? (
            <div className="space-y-2">
              <Label>App</Label>
              <div className="border-input bg-muted/40 rounded-md border px-3 py-2 text-sm">
                {selectedApp?.name ?? 'Current app'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="feature-app">App</Label>
              <NativeSelect
                id="feature-app"
                value={appId}
                onChange={(event) => handleAppChange(event.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="">
                  Platform (all apps)
                </NativeSelectOption>
                {apps.map((app) => (
                  <NativeSelectOption key={app.id} value={app.id}>
                    {app.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="feature-scope">Scope</Label>
            <NativeSelect
              id="feature-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="w-full"
            >
              <NativeSelectOption value="global">Global</NativeSelectOption>
              <NativeSelectOption value="consumer">Consumer</NativeSelectOption>
              <NativeSelectOption value="enterprise">
                Enterprise
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-876-surface-border flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="feature-enabled">Globally enabled</Label>
            <Switch
              id="feature-enabled"
              checked={defaultEnabled}
              onCheckedChange={setDefaultEnabled}
              aria-label="Globally enabled"
            />
          </div>

          <div className="border-876-surface-border flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="feature-default-value">Default value</Label>
            <Switch
              id="feature-default-value"
              checked={defaultValue}
              onCheckedChange={setDefaultValue}
              aria-label="Default value"
            />
          </div>

          <div className="border-876-surface-border flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="feature-consumer-default">Consumer default</Label>
            <Switch
              id="feature-consumer-default"
              checked={consumerDefaultEnabled}
              onCheckedChange={setConsumerDefaultEnabled}
              aria-label="Consumer default"
            />
          </div>

          <div className="border-876-surface-border flex items-center justify-between gap-4 rounded-md border p-3">
            <Label htmlFor="feature-server-side-only">Server-side only</Label>
            <Switch
              id="feature-server-side-only"
              checked={serverSideOnly}
              onCheckedChange={setServerSideOnly}
              aria-label="Server-side only"
            />
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div className="border-876-surface-border flex justify-end gap-2 border-t px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={isPending || !name.trim()}
        >
          {isPending ? 'Creating...' : 'Create feature'}
        </Button>
      </div>
    </form>
  )
}
