'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@876/admin'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { useUsernameAvailability } from '@/hooks/use-username-availability'

const ROLES = ['user', 'staff', 'admin', 'super_admin'] as const
const STATUSES = ['active', 'suspended'] as const

type Props = {
  user: AdminUser
  /**
   * The user's CURRENT Console role (or `'user'` for no access), read
   * from MC's own DB. A role change is applied through `client.users.setRole`
   * (which enforces the escalation guard), separately from the identity profile
   * update — the identity API no longer owns Console roles.
   */
  initialRole: string
}

export function EditUserForm({ user, initialRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.username ?? '')
  const [role, setRole] = useState(initialRole)
  const [status, setStatus] = useState(user.status)

  const overviewHref = `/users/${user.username ?? user.id}`

  const usernameStatus = useUsernameAvailability(username, {
    excludeUserId: user.id,
    unchangedValue: user.username,
  })

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.')
      return
    }
    if (usernameStatus.status === 'unavailable') {
      setError(usernameStatus.message)
      return
    }

    setError(null)
    startTransition(async () => {
      const { data, error: updateError } = await client.users.update(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        username: username.trim() || null,
        status,
      })
      if (updateError || !data) {
        setError(updateError?.message ?? 'Failed to update user.')
        return
      }

      // Console role lives in MC's own DB, not the identity profile —
      // apply any change through the access-grant endpoint, which enforces the
      // role-escalation guard. Only call it when the role actually changed.
      if (role !== initialRole) {
        const { error: roleError } = await client.users.setRole(user.id, role)
        if (roleError) {
          setError(roleError.message)
          return
        }
      }

      router.refresh()
      router.push(`/users/${data.username ?? data.id}`)
    })
  }

  return (
    <section className="876-card p-5">
      <div className="mb-4 flex flex-col gap-1">
        <span className="876-eyebrow">Account</span>
        <h3 className="text-foreground text-sm font-medium">
          Login and platform access
        </h3>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eu_first_name">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="eu_first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eu_last_name">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="eu_last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eu_email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="eu_email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eu_username">
            Username{' '}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="eu_username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="handle"
            spellCheck={false}
            aria-invalid={usernameStatus.status === 'unavailable'}
          />
          {usernameStatus.status === 'checking' && (
            <p className="text-muted-foreground text-sm">
              Checking availability…
            </p>
          )}
          {usernameStatus.status === 'available' && (
            <p className="text-sm text-emerald-600 dark:text-emerald-500">
              {usernameStatus.message}
            </p>
          )}
          {usernameStatus.status === 'unavailable' && (
            <p className="text-destructive text-sm">{usernameStatus.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eu_status">Status</Label>
            <NativeSelect
              id="eu_status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full capitalize"
            >
              {STATUSES.map((nextStatus) => (
                <NativeSelectOption
                  key={nextStatus}
                  value={nextStatus}
                  className="capitalize"
                >
                  {nextStatus}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eu_role">Platform role</Label>
            <NativeSelect
              id="eu_role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full capitalize"
            >
              {ROLES.map((nextRole) => (
                <NativeSelectOption
                  key={nextRole}
                  value={nextRole}
                  className="capitalize"
                >
                  {nextRole.replace('_', ' ')}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t pt-4">
        <Button
          variant="outline"
          onClick={() => router.push(overviewHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </section>
  )
}
