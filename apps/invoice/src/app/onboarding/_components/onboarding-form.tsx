'use client'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { client } from '@/lib/client'

export function OnboardingForm({ initialName = '' }: { initialName?: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    const result = await client.onboarding.createOrganization({
      name: name.trim(),
    })

    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="876-page-title">Set up your organization</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          876 Invoice bills on behalf of an organization. Name yours to
          continue.
        </p>
      </div>

      <div>
        <Label htmlFor="organization-name">Organization name</Label>
        <Input
          id="organization-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Trading Ltd"
          autoComplete="organization"
          maxLength={120}
          required
          autoFocus
        />
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="info"
        className="w-full"
        disabled={submitting || !name.trim()}
      >
        {submitting ? 'Setting up…' : 'Continue'}
      </Button>
    </form>
  )
}
