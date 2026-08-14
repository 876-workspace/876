'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { EmailInput } from '@876/ui/email-input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import type { RoleResource } from '@/types/access'

export function InviteForm({ roles }: { roles: RoleResource[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(roles[0]?.slug ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return

    setError(null)
    startTransition(async () => {
      const result = await client.invites.create({
        email: trimmedEmail,
        role: role || undefined,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to send the invite.')
        return
      }
      router.push('/settings/users')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="876-card grid max-w-2xl gap-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email address</Label>
          <EmailInput
            id="invite-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Billing role</Label>
          <NativeSelect
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={isPending || roles.length === 0}
          >
            {roles.map((billingRole) => (
              <NativeSelectOption key={billingRole.id} value={billingRole.slug}>
                {billingRole.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button
        type="submit"
        variant="info"
        disabled={isPending || !email.trim()}
      >
        {isPending ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  )
}
