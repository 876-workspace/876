'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { request } from '@/lib/client/request'
import type { OrganizationBootstrapResult } from '@/types/onboarding'

/**
 * The first post-auth step for a social or password account without an org.
 * It uses the existing Enterprise session; asking a social-only account for a
 * password here would strand it because the provider, not 876, owns its login.
 */
export function OrganizationSetup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a workspace name.')
      return
    }

    setError(null)
    setPending(true)
    const result = await request<OrganizationBootstrapResult>(
      '/api/onboarding/organization',
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    )
    setPending(false)

    if (result.error) {
      if (result.error.code === 'auth/session-invalid') {
        router.replace('/login?returnTo=%2Fonboarding')
        router.refresh()
        return
      }

      setError(result.error.message)
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-4 py-10">
      <section className="border-border/70 bg-card w-full max-w-md rounded-[1.5rem] border p-6 shadow-[0_24px_70px_rgb(15_23_42_/_10%)]">
        <p className="text-muted-foreground text-sm font-medium">
          876 Enterprise
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.03em]">
          Create your workspace
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Give your organization a name. You can invite your team and complete
          its details from the workspace.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => void submit(event)}
        >
          <div className="space-y-2">
            <Label htmlFor="organization-name">Workspace name</Label>
            <Input
              id="organization-name"
              name="organization-name"
              autoComplete="organization"
              autoFocus
              disabled={pending}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={pending} type="submit">
            {pending ? 'Creating workspace…' : 'Create workspace'}
          </Button>
        </form>
      </section>
    </main>
  )
}
