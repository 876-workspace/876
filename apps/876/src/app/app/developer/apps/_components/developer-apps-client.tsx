'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { Copy, KeyRound, Plus, Shield } from '@876/ui/icons'

import type { App, AppCreated } from '@876/sdk'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

type FormState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  app: AppCreated | null
}

export function DeveloperAppsClient({ apps }: { apps: App[] }) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<FormState>({
    status: 'idle',
    message: null,
    app: null,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get('name') ?? '').trim()
    const clientType = String(formData.get('client_type') ?? '')
    const redirectUris = String(formData.get('allowed_redirect_uris') ?? '')
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean)
    const homepageUrl =
      String(formData.get('homepage_url') ?? '').trim() || null
    const logoUrl = String(formData.get('logo_url') ?? '').trim() || null

    if (!name) {
      setState({ status: 'error', message: 'App name is required.', app: null })
      return
    }
    if (clientType !== 'public' && clientType !== 'confidential') {
      setState({
        status: 'error',
        message: 'Choose a valid client type.',
        app: null,
      })
      return
    }
    if (!redirectUris.length) {
      setState({
        status: 'error',
        message: 'Add at least one redirect URI.',
        app: null,
      })
      return
    }

    startTransition(async () => {
      const { data, error } = await client.apps.create({
        name,
        clientType,
        redirectUris,
        homepageUrl,
        logoUrl,
      })
      if (error || !data) {
        setState({
          status: 'error',
          message: error?.message ?? 'Failed to register app',
          app: null,
        })
        return
      }
      setState({
        status: 'success',
        message: data.clientSecret
          ? 'Confidential app registered. Store the client secret now; it will not be shown again.'
          : 'App registered. Use the client ID with PKCE.',
        app: data,
      })
      form.reset()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--876-blue)_12%,transparent)] text-[color:var(--876-blue)]">
            <Plus aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">
              Register an app
            </h2>
            <p className="text-muted-foreground text-sm">
              Create an OAuth client that can use Sign in with 876.
            </p>
          </div>
        </div>

        {state.message ? (
          <div
            className="mt-5 rounded-2xl border p-4 text-sm"
            data-status={state.status}
          >
            <p className="font-medium">{state.message}</p>
            {state.app ? (
              <div className="mt-4 space-y-3">
                <Credential label="Client ID" value={state.app.client_id} />
                {state.app.clientSecret ? (
                  <Credential
                    label="Client secret"
                    value={state.app.clientSecret}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            App name
            <Input name="name" placeholder="Acme dashboard" required />
          </label>

          <fieldset className="grid gap-3 rounded-2xl border p-4">
            <legend className="px-1 text-sm font-medium">Client type</legend>
            <label className="flex gap-3 text-sm">
              <input
                type="radio"
                name="client_type"
                value="public"
                defaultChecked
                className="mt-1"
              />
              <span>
                <span className="block font-medium">Public with PKCE</span>
                <span className="text-muted-foreground block leading-6">
                  Browser, mobile, or apps that cannot safely keep a secret.
                </span>
              </span>
            </label>
            <label className="flex gap-3 text-sm">
              <input
                type="radio"
                name="client_type"
                value="confidential"
                className="mt-1"
              />
              <span>
                <span className="block font-medium">
                  Confidential server app
                </span>
                <span className="text-muted-foreground block leading-6">
                  Backend apps that can protect a client secret.
                </span>
              </span>
            </label>
          </fieldset>

          <label className="grid gap-2 text-sm font-medium">
            Redirect URIs
            <Textarea
              name="allowed_redirect_uris"
              placeholder="https://app.example.com/auth/876/callback"
              required
              className="min-h-28"
            />
            <span className="text-muted-foreground text-xs font-normal">
              One URI per line. HTTPS is required except localhost.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Homepage URL
              <Input
                name="homepage_url"
                placeholder="https://app.example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Logo URL
              <Input
                name="logo_url"
                placeholder="https://app.example.com/logo.png"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--876-blue)] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_color-mix(in_oklab,var(--876-blue)_24%,transparent)] transition-colors hover:bg-[color-mix(in_oklab,var(--876-blue)_86%,black)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? 'Registering...' : 'Register app'}
          </button>
        </form>
      </section>

      <section className="border-border/70 bg-card/95 dark:bg-card/80 rounded-[1.6rem] border p-5 shadow-[0_22px_70px_rgb(15_23_42_/_7%)] sm:p-6 dark:shadow-[0_24px_80px_rgb(0_0_0_/_28%)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--876-green)_12%,transparent)] text-[color:var(--876-green)]">
            <Shield aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">
              Your apps
            </h2>
            <p className="text-muted-foreground text-sm">
              {apps.length} registered OAuth client
              {apps.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {apps.length ? (
            apps.map((app) => <RegisteredAppCard key={app.id} app={app} />)
          ) : (
            <p className="text-muted-foreground rounded-2xl border border-dashed p-5 text-sm leading-6">
              No apps registered yet. Create your first app to get a client ID.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function RegisteredAppCard({ app }: { app: App }) {
  return (
    <article className="rounded-2xl border bg-white/65 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--876-blue)_12%,transparent)] text-[color:var(--876-blue)]">
          <KeyRound aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{app.name}</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {app.client_type} client
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Credential label="Client ID" value={app.client_id} compact />
        <p className="text-muted-foreground text-xs leading-5">
          Redirect URIs: {app.allowed_redirect_uris.join(', ')}
        </p>
      </div>
    </article>
  )
}

function Credential({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <span className="bg-muted/70 flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-[0.75rem] font-normal">
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(value)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          <Copy
            aria-hidden="true"
            className={compact ? 'size-3.5' : 'size-4'}
          />
        </button>
      </span>
    </label>
  )
}
