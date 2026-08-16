'use client'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { client } from '@/lib/client'

export function OnboardingForm({
  existingOrgName,
}: {
  /** Set when the account already has an organization — Invoice is being
   * activated for it, so there is nothing to name. */
  existingOrgName?: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!existingOrgName && !name.trim()) return

    setSubmitting(true)
    setError(null)

    const result = await client.onboarding.createOrganization(
      existingOrgName ? {} : { name: name.trim() }
    )

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
        <h1 className="876-page-title">
          {existingOrgName ? 'Add 876 Invoice' : 'Set up your organization'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {existingOrgName
            ? `Turn on 876 Invoice for ${existingOrgName}. Your customers and financial records carry over.`
            : '876 Invoice bills on behalf of an organization. Name yours to continue.'}
        </p>
      </div>

      {existingOrgName ? null : (
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
      )}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="info"
        className="w-full"
        disabled={submitting || (!existingOrgName && !name.trim())}
      >
        {submitting
          ? 'Setting up…'
          : existingOrgName
            ? 'Add 876 Invoice'
            : 'Continue'}
      </Button>
    </form>
  )
}
