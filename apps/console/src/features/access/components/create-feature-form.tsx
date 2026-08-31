'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminApp } from '@876/platform/compat'
import { Alert, AlertDescription, AlertTitle } from '@876/ui/alert'
import { Button } from '@876/ui/button'
import { Info } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'

import { useAsyncValue } from '@/hooks/use-async-value'
import { client } from '@/lib/client'

export type CreateFeatureFormSetup = {
  apps: AdminApp[]
  defaultAppId?: string | null
  defaultDescription?: string
  defaultSlug?: string
  parentFeatureId?: string | null
  parentFeatureName?: string | null
  lockApp?: boolean
}

type Props = {
  setup: CreateFeatureFormSetup | Promise<CreateFeatureFormSetup>
  defaultName?: string
  returnHref?: string
  /**
   * Lets the form keep app-dependent controls inert while an async parent/app
   * context is resolving, without suspending the rest of the form.
   */
  lockAppHint?: boolean
}

export function CreateFeatureForm({
  setup,
  defaultName = '',
  returnHref = '/features',
  lockAppHint = false,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const setupState = useAsyncValue(setup)
  const resolvedSetup = setupState.value
  const apps = resolvedSetup?.apps ?? []
  const lockApp = resolvedSetup?.lockApp ?? lockAppHint

  const [name, setName] = useState(defaultName)
  const [slug, setSlug] = useState('platform_')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('global')
  const [defaultEnabled, setDefaultEnabled] = useState(false)
  const [consumerDefaultEnabled, setConsumerDefaultEnabled] = useState(false)
  const [serverSideOnly, setServerSideOnly] = useState(true)
  const [appId, setAppId] = useState('')

  const slugTouched = useRef(false)
  const descriptionTouched = useRef(false)
  const appTouched = useRef(false)
  const appliedSetup = useRef<CreateFeatureFormSetup | null>(null)

  useEffect(() => {
    if (!resolvedSetup || appliedSetup.current === resolvedSetup) return
    appliedSetup.current = resolvedSetup

    const defaultAppId = resolvedSetup.defaultAppId ?? ''
    const defaultApp = resolvedSetup.apps.find((app) => app.id === defaultAppId)

    if (!appTouched.current) setAppId(defaultAppId)
    if (!slugTouched.current) {
      setSlug(
        resolvedSetup.defaultSlug ||
          (defaultApp ? `${defaultApp.feature_prefix}_` : 'platform_')
      )
    }
    if (!descriptionTouched.current)
      setDescription(resolvedSetup.defaultDescription ?? '')
  }, [resolvedSetup])

  const selectedApp = apps.find((app) => app.id === appId)

  function handleAppChange(nextAppId: string) {
    const previousPrefix = selectedApp
      ? `${selectedApp.feature_prefix}_`
      : 'platform_'
    const nextApp = apps.find((app) => app.id === nextAppId)
    const nextPrefix = nextApp ? `${nextApp.feature_prefix}_` : 'platform_'

    appTouched.current = true
    setAppId(nextAppId)
    setSlug((current) =>
      current.startsWith(previousPrefix)
        ? `${nextPrefix}${current.slice(previousPrefix.length)}`
        : current
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !resolvedSetup) return

    setError(null)
    startTransition(async () => {
      const { data, error: resultError } = await client.features.create({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        scope,
        default_enabled: defaultEnabled,
        default_value: defaultEnabled,
        consumer_default_enabled: consumerDefaultEnabled,
        server_side_only: serverSideOnly,
        parent_feature_id: resolvedSetup.parentFeatureId ?? null,
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
    <div className="max-w-2xl space-y-4">
      {resolvedSetup?.parentFeatureName ? (
        <Alert variant="info">
          <Info />
          <AlertTitle>Child feature</AlertTitle>
          <AlertDescription>
            This feature will be created under{' '}
            <strong>{resolvedSetup.parentFeatureName}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}

      <form className="876-card" onSubmit={handleSubmit}>
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
                onChange={(event) => {
                  slugTouched.current = true
                  setSlug(event.target.value)
                }}
                spellCheck={false}
                className="font-mono"
                disabled={isPending || (setupState.pending && lockAppHint)}
              />
              <p className="text-muted-foreground text-xs">
                {setupState.pending && lockAppHint ? (
                  'Loading app prefix…'
                ) : (
                  <>
                    Keys for this app must start with{' '}
                    <code>
                      {selectedApp
                        ? `${selectedApp.feature_prefix}_`
                        : 'platform_'}
                    </code>
                    .
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature-description">Description</Label>
            <Textarea
              id="feature-description"
              placeholder="Optional description"
              value={description}
              onChange={(event) => {
                descriptionTouched.current = true
                setDescription(event.target.value)
              }}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {lockApp ? (
              <div className="space-y-2">
                <Label>App</Label>
                <div className="border-input bg-muted/40 rounded-md border px-3 py-2 text-[0.8125rem]">
                  {setupState.pending
                    ? 'Loading app…'
                    : (selectedApp?.name ?? 'Platform (all apps)')}
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
                  disabled={setupState.pending || Boolean(setupState.error)}
                >
                  <NativeSelectOption value="">
                    {setupState.pending
                      ? 'Loading apps…'
                      : setupState.error
                        ? 'Apps unavailable'
                        : 'Platform (all apps)'}
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
                <NativeSelectOption value="consumer">
                  Consumer
                </NativeSelectOption>
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

          {setupState.error && !error ? (
            <p className="text-destructive text-[0.8125rem]">
              {setupState.error.message}
            </p>
          ) : null}
          {error && (
            <p className="text-destructive text-[0.8125rem]">{error}</p>
          )}
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
            disabled={
              isPending ||
              setupState.pending ||
              Boolean(setupState.error) ||
              !name.trim()
            }
          >
            {isPending ? 'Creating...' : 'Create feature'}
          </Button>
        </div>
      </form>
    </div>
  )
}
