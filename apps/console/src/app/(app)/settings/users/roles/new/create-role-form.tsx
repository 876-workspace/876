'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { useConsoleUser } from '@/stores/user'

import { client } from '@/lib/client'
import { PERMISSION_GROUPS } from '@/lib/permissions'

export function CreateRoleForm() {
  const router = useRouter()
  const actor = useConsoleUser()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  function handleNameInput(value: string) {
    // Auto-slug the name field
    setName(
      value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/__+/g, '_')
    )
  }

  function handleSubmit() {
    setError(null)
    if (!name.trim() || !displayName.trim()) {
      setError('Name and display name are required.')
      return
    }
    startTransition(async () => {
      const { data, error } = await client.roles.create({
        name,
        displayName,
        description: description || undefined,
        permissions: Array.from(selected),
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to create role.')
      } else {
        track(AnalyticsEvent.RoleCreated, {
          properties: {
            role_name: data.name,
            actor_user_id: actor?.id ?? null,
          },
        })
        router.push(`/settings/users/roles/${data.name}`)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Details */}
      <section>
        <h2 className="876-section-title mb-4">Details</h2>
        <div className="876-card max-w-lg space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
              Name
              <span className="text-muted-foreground ml-1 font-mono text-xs">
                (slug)
              </span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameInput(e.target.value)}
              placeholder="e.g. content_editor"
              spellCheck={false}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Lowercase letters, numbers, underscores only. Cannot be changed
              after creation.
            </p>
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="display_name"
            >
              Display Name
            </label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Content Editor"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="description"
            >
              Description
              <span className="text-muted-foreground ml-1 font-normal">
                (optional)
              </span>
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role grant?"
            />
          </div>
        </div>
      </section>

      {/* Permissions */}
      <section>
        <h2 className="876-section-title mb-4">Permissions</h2>
        <div className="876-card overflow-hidden">
          {PERMISSION_GROUPS.map((group, gi) => (
            <div
              key={group.label}
              className={gi < PERMISSION_GROUPS.length - 1 ? 'border-b' : ''}
            >
              <div className="bg-muted/40 dark:bg-muted/20 px-5 py-2.5">
                <span className="876-eyebrow font-semibold">{group.label}</span>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-3">
                {group.permissions.map((perm) => {
                  const checked = selected.has(perm.value)
                  return (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => toggle(perm.value)}
                      aria-pressed={checked}
                      className={`focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                        checked
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
                      }`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600 dark:bg-blue-400' : 'bg-muted-foreground/50'}`}
                      />
                      {perm.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {selected.size} permission{selected.size !== 1 ? 's' : ''} selected
        </p>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Role'}
        </Button>
        {error && <span className="text-destructive text-sm">{error}</span>}
      </div>
    </div>
  )
}
