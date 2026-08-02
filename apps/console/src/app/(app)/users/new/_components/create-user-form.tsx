'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'
import { useUsernameAvailability } from '@/hooks/use-username-availability'

export function CreateUserForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [middleName, setMiddleName] = useState('')

  const usernameStatus = useUsernameAvailability(username)

  function handleSubmit() {
    setError(null)
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('First name, last name, and email are required.')
      return
    }
    if (usernameStatus.status === 'unavailable') {
      setError(usernameStatus.message)
      return
    }
    startTransition(async () => {
      const { data, error } = await client.users.create({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || null,
        username: username.trim() || null,
        organization_name: organizationName.trim() || undefined,
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to create user.')
      } else {
        router.push(`/users/${data.username ?? data.id}`)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Fields */}
      <div className="876-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="876-eyebrow">Details</span>
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
            aria-label={
              showOptional ? 'Hide optional fields' : 'Show optional fields'
            }
          >
            {showOptional ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            Optional fields
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="first_name"
              >
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                autoFocus
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="last_name"
              >
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>

          {showOptional && (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="middle_name"
              >
                Middle Name
              </label>
              <Input
                id="middle_name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          {showOptional && (
            <>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="username"
                >
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  spellCheck={false}
                  aria-invalid={usernameStatus.status === 'unavailable'}
                />
                {usernameStatus.status === 'checking' && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Checking availability…
                  </p>
                )}
                {usernameStatus.status === 'available' && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                    {usernameStatus.message}
                  </p>
                )}
                {usernameStatus.status === 'unavailable' && (
                  <p className="text-destructive mt-1 text-xs">
                    {usernameStatus.message}
                  </p>
                )}
                {usernameStatus.status === 'idle' && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Auto-generated from email if blank.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="organization_name"
                >
                  Organization Name
                </label>
                <Input
                  id="organization_name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Corp"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  If provided, creates a new org and adds the user as owner.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="info" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create User'}
        </Button>
        {error && <span className="text-destructive text-sm">{error}</span>}
      </div>
    </div>
  )
}
